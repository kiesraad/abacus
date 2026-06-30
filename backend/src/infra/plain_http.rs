//! Plaintext HTTP server for redirects and serving the local CA certificate
//!
//! Alongside HTTPS, Abacus runs a small HTTP server that lets clients download
//! the local CA certificate (so they can trust the server before reaching it
//! over HTTPS) and redirects every other request to HTTPS. Its port is
//! configurable via the `--http-port` CLI argument.

use std::sync::Arc;

use axum::{
    http::{HeaderMap, StatusCode, Uri, header, uri::Authority},
    response::{IntoResponse, Redirect, Response},
};
use tokio::net::TcpListener;
use tracing::info;

use crate::{
    AppError,
    infra::{router::ca_router, tls::CaCertificate},
};

/// Redirect any request to the same path on HTTPS.
fn redirect_to_https(uri: &Uri, headers: &HeaderMap, https_port: u16) -> Response {
    let Some(authority) = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<Authority>().ok())
    else {
        return StatusCode::BAD_REQUEST.into_response();
    };
    let host = authority.host();
    let target = if https_port == 443 {
        host.to_owned()
    } else {
        format!("{host}:{https_port}")
    };
    let path_and_query = uri.path_and_query().map_or("/", |pq| pq.as_str());
    Redirect::permanent(&format!("https://{target}{path_and_query}")).into_response()
}

/// Start the plaintext HTTP server on `listener`: it serves the CA
/// certificate for download and redirects everything else to HTTPS.
pub async fn start_plain_http_server(
    listener: TcpListener,
    ca: Arc<CaCertificate>,
    https_port: u16,
) -> Result<(), AppError> {
    let app = ca_router(&ca).fallback(move |uri: Uri, headers: HeaderMap| async move {
        redirect_to_https(&uri, &headers, https_port)
    });
    info!(
        "Starting HTTP redirect and CA download server on http://{}",
        listener.local_addr()?
    );
    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(crate::shutdown_signal())
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{net::SocketAddr, sync::Arc};

    use axum::http::{HeaderMap, Uri};
    use reqwest::{StatusCode, header, redirect::Policy};
    use tokio::{net::TcpListener, task::JoinHandle};

    use super::{redirect_to_https, start_plain_http_server};
    use crate::infra::tls::{CaCertificate, load_or_generate};

    /// Test helper to build the redirect location for a given host header and HTTPS port
    fn redirect_location(host: &str, https_port: u16) -> String {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, host.parse().unwrap());
        let uri: Uri = "/some/path?x=1".parse().unwrap();
        redirect_to_https(&uri, &headers, https_port)
            .headers()
            .get(header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap()
            .to_owned()
    }

    /// Test helper to spawn the redirect server
    async fn spawn_redirect_server(https_port: u16) -> (SocketAddr, CaCertificate, JoinHandle<()>) {
        let dir = tempfile::tempdir().unwrap();
        let certificates = load_or_generate(&dir.path().join("tls")).unwrap();
        let ca = certificates.ca.clone();

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let server_ca = Arc::new(ca.clone());
        let task = tokio::spawn(async move {
            start_plain_http_server(listener, server_ca, https_port)
                .await
                .unwrap();
        });
        (addr, ca, task)
    }

    /// Test helper to execute a non-CA request and return its response.
    async fn redirect_response(addr: SocketAddr) -> reqwest::Response {
        let client = reqwest::Client::builder()
            .redirect(Policy::none())
            .build()
            .unwrap();
        client
            .get(format!("http://{addr}/some/path?x=1"))
            .send()
            .await
            .unwrap()
    }

    #[test]
    fn test_redirect_location_port() {
        assert_eq!(
            redirect_location("example.com:80", 443),
            "https://example.com/some/path?x=1"
        );
        assert_eq!(
            redirect_location("example.com", 8443),
            "https://example.com:8443/some/path?x=1"
        );
        assert_eq!(
            redirect_location("127.0.0.1:8080", 443),
            "https://127.0.0.1/some/path?x=1"
        );
        assert_eq!(
            redirect_location("[::1]:80", 8443),
            "https://[::1]:8443/some/path?x=1"
        );
        assert_eq!(
            redirect_location("[2001:db8::1]:443", 443),
            "https://[2001:db8::1]/some/path?x=1"
        );
    }

    #[test]
    fn test_redirect_without_host_header_is_bad_request() {
        let response = redirect_to_https(&"/foo".parse::<Uri>().unwrap(), &HeaderMap::new(), 443);
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_serves_ca_certificate_over_http() {
        let (addr, ca, task) = spawn_redirect_server(443).await;
        let client = reqwest::Client::new();

        let pem = client
            .get(format!("http://{addr}/ca.pem"))
            .send()
            .await
            .unwrap();
        assert_eq!(pem.status(), StatusCode::OK);
        assert_eq!(
            pem.headers()[header::CONTENT_TYPE],
            "application/x-pem-file"
        );
        assert_eq!(
            pem.headers()[header::X_CONTENT_TYPE_OPTIONS],
            "nosniff",
            "the CA download carries the app's security headers"
        );
        assert_eq!(pem.text().await.unwrap(), ca.pem);

        let cer = client
            .get(format!("http://{addr}/ca.cer"))
            .send()
            .await
            .unwrap();
        assert_eq!(cer.status(), StatusCode::OK);
        assert_eq!(cer.headers()[header::CONTENT_TYPE], "application/pkix-cert");
        assert_eq!(cer.bytes().await.unwrap().as_ref(), ca.der.as_slice());

        task.abort();
        let _ = task.await;
    }

    #[tokio::test]
    async fn test_redirect_to_https_omits_default_port() {
        let (addr, _ca, task) = spawn_redirect_server(443).await;

        let response = redirect_response(addr).await;
        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        assert_eq!(
            response.headers()[header::LOCATION],
            "https://127.0.0.1/some/path?x=1",
            "default port 443 is omitted, path and query preserved"
        );

        task.abort();
        let _ = task.await;
    }

    #[tokio::test]
    async fn test_redirect_to_https_includes_nondefault_port() {
        let (addr, _ca, task) = spawn_redirect_server(8443).await;

        let response = redirect_response(addr).await;
        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        assert_eq!(
            response.headers()[header::LOCATION],
            "https://127.0.0.1:8443/some/path?x=1",
            "a non-default HTTPS port is included in the redirect target"
        );

        task.abort();
        let _ = task.await;
    }
}
