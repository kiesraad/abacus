use std::net::Ipv4Addr;

pub(crate) const TEST_USER_AGENT: &str = "TestAgent/1.0";
pub(crate) const TEST_UNSPECIFIED_IP_ADDRESS: &str = "0.0.0.0";
pub(crate) const TEST_IP_V4_ADDR: Ipv4Addr = Ipv4Addr::new(203, 0, 113, 0); // Part of the TEST-NET-3 IP range
pub(crate) const TEST_EPHEMERAL_PORT: u16 = 49152; // First ephemeral port per RFC 6335
