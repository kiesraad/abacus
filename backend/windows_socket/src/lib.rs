//! Set `SO_EXCLUSIVEADDRUSE` on Windows sockets.
//!
//! `socket2` does not expose this option yet:
//! <https://github.com/rust-lang/socket2/issues/676>.
//!
//! Microsoft recommends `SO_EXCLUSIVEADDRUSE` for server sockets:
//! <https://learn.microsoft.com/en-us/windows/win32/winsock/using-so-reuseaddr-and-so-exclusiveaddruse#application-strategies>.

#![cfg(windows)]

use std::{
    io,
    os::windows::io::{AsRawSocket, BorrowedSocket},
};

use windows_sys::Win32::Networking::WinSock::{
    SO_EXCLUSIVEADDRUSE, SOCKET_ERROR, SOL_SOCKET, WSAGetLastError, setsockopt,
};

/// Prevent other sockets from binding to the same address and port.
///
/// Call before binding, with `SO_REUSEADDR` disabled.
/// Returns the Winsock error if setting the option fails.
#[expect(
    unsafe_code,
    reason = "Winsock has no safe API for SO_EXCLUSIVEADDRUSE"
)]
pub fn set_exclusive_address_use(socket: BorrowedSocket<'_>) -> io::Result<()> {
    let enabled: i32 = 1;
    // SAFETY: The socket is borrowed and stays open during the call. Winsock
    // expects a 32-bit boolean for this option. `enabled` lives until the call
    // returns, and setsockopt reads its value without keeping the pointer.
    let result = unsafe {
        setsockopt(
            socket.as_raw_socket() as _,
            SOL_SOCKET,
            SO_EXCLUSIVEADDRUSE,
            std::ptr::from_ref(&enabled).cast(),
            size_of::<i32>() as i32,
        )
    };

    if result == SOCKET_ERROR {
        // SAFETY: WSAGetLastError can be called at any time. No Winsock calls
        // have occurred on this thread since setsockopt failed.
        Err(io::Error::from_raw_os_error(unsafe { WSAGetLastError() }))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::{
        net::{Ipv4Addr, Ipv6Addr, SocketAddr},
        os::windows::io::AsSocket,
    };

    use socket2::{Domain, Protocol, Socket, Type};
    use windows_sys::Win32::Networking::WinSock::WSAEACCES;

    use super::*;

    #[test]
    fn exclusive_listener_rejects_reuse_address() {
        let listener = Socket::new(Domain::IPV6, Type::STREAM, Some(Protocol::TCP)).unwrap();
        listener.set_only_v6(false).unwrap();
        set_exclusive_address_use(listener.as_socket()).unwrap();
        listener
            .bind(&SocketAddr::from((Ipv6Addr::UNSPECIFIED, 0)).into())
            .unwrap();
        listener.listen(1).unwrap();
        let port = listener.local_addr().unwrap().as_socket().unwrap().port();

        for address in [
            SocketAddr::from((Ipv6Addr::UNSPECIFIED, port)),
            SocketAddr::from((Ipv4Addr::LOCALHOST, port)),
            SocketAddr::from((Ipv6Addr::LOCALHOST, port)),
        ] {
            let domain = if address.is_ipv4() {
                Domain::IPV4
            } else {
                Domain::IPV6
            };
            let competitor = Socket::new(domain, Type::STREAM, Some(Protocol::TCP)).unwrap();
            competitor.set_reuse_address(true).unwrap();

            let error = competitor.bind(&address.into()).unwrap_err();
            assert_eq!(error.raw_os_error(), Some(WSAEACCES));
        }
    }

    #[test]
    fn returns_winsock_error_when_reuse_address_is_enabled() {
        let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP)).unwrap();
        socket.set_reuse_address(true).unwrap();

        let error = set_exclusive_address_use(socket.as_socket()).unwrap_err();

        assert_eq!(
            error.raw_os_error(),
            Some(windows_sys::Win32::Networking::WinSock::WSAEINVAL)
        );
    }
}
