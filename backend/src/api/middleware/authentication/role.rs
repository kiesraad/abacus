use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};

use axum::{
    extract::{FromRequestParts, OptionalFromRequestParts, Request},
    http::request::Parts,
    response::{IntoResponse, Response},
};
use tower::{Layer, Service};
use utoipa::openapi::security::SecurityRequirement;
use utoipa_axum::router::UtoipaMethodRouter;

use utoipa::openapi::path::{Operation, Paths};

use super::error::AuthenticationError;
use crate::{APIError, domain::role::Role, repository::user_repo::User};

pub trait RouteAuthorization<S>
where
    S: Send + Sync + Clone + 'static,
{
    fn authorize(self, roles: &[Role]) -> UtoipaMethodRouter<S>;
    fn public(self) -> UtoipaMethodRouter<S>;
}

impl<S> RouteAuthorization<S> for UtoipaMethodRouter<S>
where
    S: Send + Sync + Clone + 'static,
{
    fn authorize(self, roles: &[Role]) -> UtoipaMethodRouter<S> {
        let (schemas, mut paths, method_router) = self;

        let scopes: Vec<String> = roles.iter().map(|r| r.to_string()).collect();
        let security_req = SecurityRequirement::new(super::SECURITY_SCHEME_NAME, scopes.clone());
        let extra = scopes.join(", ");

        for_each_operation(&mut paths, |operation| {
            operation.security = Some(vec![security_req.clone()]);
            operation.summary = Some(match &operation.summary {
                Some(existing) => format!("{} ({})", existing, extra),
                None => extra.clone(),
            });
        });

        // Add the middleware layer to the method router
        (schemas, paths, method_router.layer(authorize_roles(roles)))
    }

    fn public(self) -> UtoipaMethodRouter<S> {
        let (schemas, mut paths, method_router) = self;

        for_each_operation(&mut paths, |operation| {
            operation.tags = Some(match &operation.tags {
                Some(existing) => {
                    let mut tags = existing.clone();
                    tags.push("public".to_string());
                    tags
                }
                None => vec!["public".to_string()],
            });
        });

        (schemas, paths, method_router)
    }
}

fn for_each_operation(paths: &mut Paths, f: impl Fn(&mut Operation)) {
    for path_item in paths.paths.values_mut() {
        for operation in [
            &mut path_item.get,
            &mut path_item.post,
            &mut path_item.put,
            &mut path_item.delete,
            &mut path_item.patch,
        ]
        .into_iter()
        .flatten()
        {
            f(operation);
        }
    }
}

pub fn authorize_roles(roles: &[Role]) -> RouteAuthorizationLayer {
    RouteAuthorizationLayer {
        roles: roles.to_vec(),
    }
}

#[derive(Clone)]
pub struct RouteAuthorizationLayer {
    roles: Vec<Role>,
}

impl<S> Layer<S> for RouteAuthorizationLayer {
    type Service = RouteAuthorizationService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RouteAuthorizationService {
            roles: self.roles.clone(),
            inner,
        }
    }
}

#[derive(Clone)]
pub struct RouteAuthorizationService<S> {
    roles: Vec<Role>,
    inner: S,
}

impl<S> Service<Request> for RouteAuthorizationService<S>
where
    S: Service<Request, Response = Response> + Clone + Send + 'static,
    S::Future: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request) -> Self::Future {
        let roles = self.roles.clone();
        let clone = self.inner.clone();

        // https://docs.rs/tower/latest/tower/trait.Service.html#be-careful-when-cloning-inner-services
        let mut inner = std::mem::replace(&mut self.inner, clone);

        Box::pin(async move {
            let user = request.extensions().get::<User>();

            match user {
                None => Ok(APIError::from(AuthenticationError::Unauthenticated).into_response()),
                Some(user) if !roles.contains(&user.role()) => {
                    Ok(APIError::from(AuthenticationError::Forbidden).into_response())
                }
                _ => inner.call(request).await,
            }
        })
    }
}

/// A user with potentially no fullname or needs_password_change=true
pub struct IncompleteUser(pub User);

/// Implement the FromRequestParts trait for IncompleteUser,
/// for endpoints that are needed to fully set up the account
impl<S> FromRequestParts<S> for IncompleteUser
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(user) = parts.extensions.get::<User>() else {
            return Err(AuthenticationError::Unauthenticated.into());
        };

        if user.fullname().is_some() && !user.needs_password_change() {
            return Err(AuthenticationError::UserAlreadySetup.into());
        }

        Ok(IncompleteUser(user.clone()))
    }
}

/// Implement the FromRequestParts trait for User, this allows us to extract a User from a request
impl<S> FromRequestParts<S> for User
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(user) = parts.extensions.get::<User>() else {
            return Err(AuthenticationError::Unauthenticated.into());
        };

        if user.fullname().is_none() || user.needs_password_change() {
            return Err(AuthenticationError::Unauthenticated.into());
        }

        Ok(user.clone())
    }
}

/// Implement the OptionalFromRequestParts trait for User, this allows us to extract an `Option<User>` from a request
impl<S> OptionalFromRequestParts<S> for User
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(parts.extensions.get::<User>().cloned())
    }
}

#[cfg(test)]
mod tests {
    use super::super::SECURITY_SCHEME_NAME;
    use super::*;

    mod utoipa_route_authorization {
        use utoipa::openapi::{
            SecurityRequirement,
            path::{HttpMethod, OperationBuilder, PathItemBuilder, PathsBuilder},
        };

        use super::*;

        fn build_method_router(summary: Option<&str>) -> UtoipaMethodRouter<()> {
            let mut builder = OperationBuilder::new();
            if let Some(s) = summary {
                builder = builder.summary(Some(s));
            }
            let operation = builder.build();
            let path_item = PathItemBuilder::new()
                .operation(HttpMethod::Get, operation)
                .build();
            let paths = PathsBuilder::new().path("/test", path_item).build();
            let method_router = axum::routing::get(|| async { "ok" });
            (vec![], paths, method_router)
        }

        #[test]
        fn authorize_sets_security() {
            let router = build_method_router(Some("Test endpoint"));
            let roles = &[Role::Administrator, Role::CoordinatorGSB];

            let (_, paths, _) = router.authorize(roles);

            let path_item = paths.paths.values().next().expect("should have a path");
            let operation = path_item.get.as_ref().expect("should have GET operation");
            let security = operation.security.as_ref().expect("security should be set");

            assert_eq!(security.len(), 1);
            let expected = SecurityRequirement::new(
                super::SECURITY_SCHEME_NAME,
                [
                    Role::Administrator.to_string(),
                    Role::CoordinatorGSB.to_string(),
                ],
            );
            assert!(security[0] == expected, "security requirement mismatch");
        }

        #[test]
        fn authorize_sets_summary_with_existing_description() {
            let router = build_method_router(Some("Test endpoint"));
            let roles = &[Role::Administrator];

            let (_, paths, _) = router.authorize(roles);

            let path_item = paths.paths.values().next().unwrap();
            let operation = path_item.get.as_ref().unwrap();
            let summary = operation.summary.as_ref().unwrap();
            assert_eq!(summary, "Test endpoint (administrator)");
        }

        #[test]
        fn authorize_sets_summary_without_existing_description() {
            let router = build_method_router(None);

            let roles = &[Role::TypistGSB, Role::TypistCSB];
            let (_, paths, _) = router.authorize(roles);

            let path_item = paths.paths.values().next().unwrap();
            let summary = path_item.get.as_ref().unwrap().summary.as_ref().unwrap();
            assert_eq!(summary, "typist_gsb, typist_csb");
        }

        #[test]
        fn public_adds_public_tag() {
            let router = build_method_router(Some("Test endpoint"));

            let (_, paths, _) = router.public();

            let path_item = paths.paths.values().next().unwrap();
            let operation = path_item.get.as_ref().unwrap();
            let tags = operation.tags.as_ref().expect("tags should be set");
            assert!(tags.contains(&"public".to_string()));
        }
    }

    mod tower_authorization {
        use axum::body::Body;
        use axum::http::{Request, StatusCode};
        use tower::{Service, ServiceExt};

        use super::*;

        #[tokio::test]
        async fn service_reject_unauthenticated_user() {
            let mut service = authorize_roles(&[Role::Administrator])
                .layer(axum::routing::get(|| async { "ok" }));

            let request = Request::builder().body(Body::empty()).unwrap();

            let response = ServiceExt::<Request<Body>>::ready(&mut service)
                .await
                .unwrap()
                .call(request)
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        }

        #[tokio::test]
        async fn service_allow_correct_role() {
            let mut service = authorize_roles(&[Role::Administrator])
                .layer(axum::routing::get(|| async { "ok" }));

            let user = User::test_user(Role::Administrator, 1.into());
            let mut request = Request::builder().body(Body::empty()).unwrap();
            request.extensions_mut().insert(user);

            let response = ServiceExt::<Request<Body>>::ready(&mut service)
                .await
                .unwrap()
                .call(request)
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }

        #[tokio::test]
        async fn service_rejects_wrong_role() {
            let mut service = authorize_roles(&[Role::Administrator])
                .layer(axum::routing::get(|| async { "ok" }));

            let user = User::test_user(Role::TypistGSB, 2.into());
            let mut request = Request::builder().body(Body::empty()).unwrap();
            request.extensions_mut().insert(user);

            let response = ServiceExt::<Request<Body>>::ready(&mut service)
                .await
                .unwrap()
                .call(request)
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::FORBIDDEN);
        }

        #[tokio::test]
        async fn service_allows_any_of_correct_roles() {
            let mut service = authorize_roles(&[Role::CoordinatorGSB, Role::CoordinatorCSB])
                .layer(axum::routing::get(|| async { "ok" }));

            let user = User::test_user(Role::CoordinatorCSB, 3.into());
            let mut request = Request::builder().body(Body::empty()).unwrap();
            request.extensions_mut().insert(user);

            let response = ServiceExt::<Request<Body>>::ready(&mut service)
                .await
                .unwrap()
                .call(request)
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }
    }
}
