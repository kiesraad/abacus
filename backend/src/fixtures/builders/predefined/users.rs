use crate::{domain::role::Role, fixtures::builders::user::UserBuilder};

/// All predefined users, in insertion order (determines their ids).
pub const ALL_USERS: [fn(UserBuilder) -> UserBuilder; 14] = [
    user_admin1,
    user_admin2,
    user_coordinator1,
    user_coordinator2,
    user_typist1,
    user_typist2,
    user_coordinator3,
    user_coordinator4,
    user_typist3,
    user_typist4,
    user_coordinator5,
    user_coordinator6,
    user_typist5,
    user_typist6,
];

pub fn user_admin1(b: UserBuilder) -> UserBuilder {
    b.username("admin1")
        .role(Role::Administrator)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$trZGY1jE5OSpt+NG9NvY1w$vofrcEyML5A70ZR6EhwdqfLsv81DjkYMJvgXeKFLqQ4")
        .fullname("Sanne Molenaar")
        .is_active(true)
}

pub fn user_admin2(b: UserBuilder) -> UserBuilder {
    b.username("admin2")
        .role(Role::Administrator)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$T3GsSA2b0DoADC99nNvUiQ$aFbvgSyHJwEly0s88XypgceNNXtJVhBmCD5Eu9/xD7I")
        .fullname("Jef van Reybrouck")
        .is_active(true)
}

pub fn user_coordinator1(b: UserBuilder) -> UserBuilder {
    b.username("coordinator1")
        .role(Role::CoordinatorGSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$D6QmytaEld06P+sZ1p5osg$RqPv1nE7sosIeEoAl9wA96dC1R9RTO9om9aOYZPi3iw")
        .fullname("Mohammed van der Velden")
}

pub fn user_coordinator2(b: UserBuilder) -> UserBuilder {
    b.username("coordinator2")
        .role(Role::CoordinatorGSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$woqeLdtLDDF6BYkGKx+G3w$OpwuIwdiQoLVZxvPwmH6y0AEw+ntG45SSghhchzgtZY")
        .fullname("Mei Chen")
}

pub fn user_coordinator3(b: UserBuilder) -> UserBuilder {
    b.username("coordinator3")
        .role(Role::CoordinatorCSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$xy1C66/T3FaLHuvcA9hFKg$3SYm29uxBqHDY2nJjm1vC130lIBOC/pNcid4aqF/9qs")
        .fullname("John Doe")
}

pub fn user_coordinator4(b: UserBuilder) -> UserBuilder {
    b.username("coordinator4")
        .role(Role::CoordinatorCSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$RKS2dISB4DeyPS6uz+h83g$R6Q8fWkF8L2H0wmqwkT3zsAGSL3JiOyGhAp402gxp9g")
        .fullname("Jane Doe")
}

pub fn user_coordinator5(b: UserBuilder) -> UserBuilder {
    b.username("coordinator5")
        .role(Role::CoordinatorHSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$Q0i3bcOjsJGYofuBeiMqUw$c7P+Q+p9czzdNYmEsMSZALguZJjImUIRI+SQWS3O5VE")
        .fullname("Rolien Aaftink")
}

pub fn user_coordinator6(b: UserBuilder) -> UserBuilder {
    b.username("coordinator6")
        .role(Role::CoordinatorHSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$nr8HwBha0xSabUWgW7eQig$jGe0ybwwSK/te3Hd/HCtxboFOdQPhOpe/E72Q4c+Rh4")
        .fullname("Stefan Borger")
}

pub fn user_typist1(b: UserBuilder) -> UserBuilder {
    b.username("typist1")
        .role(Role::TypistGSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$xQo7+6SEm9qRdViNg3/hsg$nA926/HWrQfih8xx5NPR5PXvtE2DqndImHiPWP7HDdQ")
        .fullname("Sam Kuijpers")
}

pub fn user_typist2(b: UserBuilder) -> UserBuilder {
    b.username("typist2")
        .role(Role::TypistGSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$5sNjyikhzF20KjO+UCvUdQ$4QIl7i3U9f7bn0OL2XxXiJh5ZNMy05JVro/3FiU35fo")
        .fullname("Aliyah van den Berg")
}

pub fn user_typist3(b: UserBuilder) -> UserBuilder {
    b.username("typist3")
        .role(Role::TypistCSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$C4oIGknbccexw5jrLQJfNA$V9FrzbtEnuBv+lOAV9AtiHSo/u7y/FMGfekA3PS4zNs")
        .fullname("Henry Smith")
}

pub fn user_typist4(b: UserBuilder) -> UserBuilder {
    b.username("typist4")
        .role(Role::TypistCSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$jQfNR2cC7cwOL9ZDaMOArw$lPfXNrk0T3bAyzkKzM28JsuE4xt+2+qXPRhswl+FrhQ")
        .fullname("Alice Smith")
}

pub fn user_typist5(b: UserBuilder) -> UserBuilder {
    b.username("typist5")
        .role(Role::TypistHSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$pvVUP2osh8PW9g4sF4IKqA$66JmMprJC6dPy9OpaTw2TWX7n1ywXhVZHoPhoufaxWc")
        .fullname("Guust te Kiefte")
}

pub fn user_typist6(b: UserBuilder) -> UserBuilder {
    b.username("typist6")
        .role(Role::TypistHSB)
        .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$Gxu7hahi/qI3LmTxiSQE9w$gcp7uvWUvq3mMtyESqzWIs07ozU+DaTEr51MGP3iqTA")
        .fullname("Trees Hensbergen")
}
