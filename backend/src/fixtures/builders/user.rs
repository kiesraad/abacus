use sqlx::SqliteConnection;

use crate::{
    api::{
        middleware::authentication::password::HashedPassword,
        user::{CreateUserRequest, ValidateUserRequest},
    },
    domain::role::Role,
    fixtures::builders::FixtureContext,
    repository::user_repo::{self, User},
};

#[derive(Default)]
pub struct UserBuilder {
    username: Option<String>,
    role: Option<Role>,
    fullname: Option<String>,
    hashed_password: Option<String>,
    is_active: bool,
}

pub struct UserContext {
    pub user: User,
    pub plain_password: String,
}

#[expect(clippy::too_many_lines)]
impl UserBuilder {
    pub fn fixture(self, user_fixture: &UserFixture) -> Self {
        use UserFixture::*;
        match user_fixture {
            Admin1 => self
                .username("admin1")
                .role(Role::Administrator)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$trZGY1jE5OSpt+NG9NvY1w$vofrcEyML5A70ZR6EhwdqfLsv81DjkYMJvgXeKFLqQ4")
                .fullname("Sanne Molenaar")
                .is_active(true),
            Admin2 => self
                .username("admin2")
                .role(Role::Administrator)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$T3GsSA2b0DoADC99nNvUiQ$aFbvgSyHJwEly0s88XypgceNNXtJVhBmCD5Eu9/xD7I")
                .fullname("Jef van Reybrouck")
                .is_active(true),
            Coordinator1 => self
                .username("coordinator1")
                .role(Role::CoordinatorGSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$D6QmytaEld06P+sZ1p5osg$RqPv1nE7sosIeEoAl9wA96dC1R9RTO9om9aOYZPi3iw")
                .fullname("Mohammed van der Velden"),
            Coordinator2 => self
                .username("coordinator2")
                .role(Role::CoordinatorGSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$woqeLdtLDDF6BYkGKx+G3w$OpwuIwdiQoLVZxvPwmH6y0AEw+ntG45SSghhchzgtZY")
                .fullname("Mei Chen"),
            Coordinator3 => self
                .username("coordinator3")
                .role(Role::CoordinatorCSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$xy1C66/T3FaLHuvcA9hFKg$3SYm29uxBqHDY2nJjm1vC130lIBOC/pNcid4aqF/9qs")
                .fullname("John Doe"),
            Coordinator4 => self
                .username("coordinator4")
                .role(Role::CoordinatorCSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$RKS2dISB4DeyPS6uz+h83g$R6Q8fWkF8L2H0wmqwkT3zsAGSL3JiOyGhAp402gxp9g")
                .fullname("Jane Doe"),
            Coordinator5 => self
                .username("coordinator5")
                .role(Role::CoordinatorHSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$Q0i3bcOjsJGYofuBeiMqUw$c7P+Q+p9czzdNYmEsMSZALguZJjImUIRI+SQWS3O5VE")
                .fullname("Rolien Aaftink"),
            Coordinator6 => self
                .username("coordinator6")
                .role(Role::CoordinatorHSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$nr8HwBha0xSabUWgW7eQig$jGe0ybwwSK/te3Hd/HCtxboFOdQPhOpe/E72Q4c+Rh4")
                .fullname("Stefan Borger"),
            Typist1 => self
                .username("typist1")
                .role(Role::TypistGSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$xQo7+6SEm9qRdViNg3/hsg$nA926/HWrQfih8xx5NPR5PXvtE2DqndImHiPWP7HDdQ")
                .fullname("Sam Kuijpers"),
            Typist2 => self
                .username("typist2")
                .role(Role::TypistGSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$5sNjyikhzF20KjO+UCvUdQ$4QIl7i3U9f7bn0OL2XxXiJh5ZNMy05JVro/3FiU35fo")
                .fullname("Aliyah van den Berg"),
            Typist3 => self
                .username("typist3")
                .role(Role::TypistCSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$C4oIGknbccexw5jrLQJfNA$V9FrzbtEnuBv+lOAV9AtiHSo/u7y/FMGfekA3PS4zNs")
                .fullname("Henry Smith"),
            Typist4 => self
                .username("typist4")
                .role(Role::TypistCSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$jQfNR2cC7cwOL9ZDaMOArw$lPfXNrk0T3bAyzkKzM28JsuE4xt+2+qXPRhswl+FrhQ")
                .fullname("Alice Smith"),
            Typist5 => self
                .username("typist5")
                .role(Role::TypistHSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$pvVUP2osh8PW9g4sF4IKqA$66JmMprJC6dPy9OpaTw2TWX7n1ywXhVZHoPhoufaxWc")
                .fullname("Guust te Kiefte"),
            Typist6 => self
                .username("typist6")
                .role(Role::TypistHSB)
                .hashed_password("$argon2id$v=19$m=19456,t=2,p=1$Gxu7hahi/qI3LmTxiSQE9w$gcp7uvWUvq3mMtyESqzWIs07ozU+DaTEr51MGP3iqTA")
                .fullname("Trees Hensbergen"),
        }
    }

    pub fn username(mut self, username: &str) -> Self {
        self.username = Some(username.to_string());
        self
    }

    pub fn role(mut self, role: Role) -> Self {
        self.role = Some(role);
        self
    }

    pub fn fullname(mut self, fullname: &str) -> Self {
        self.fullname = Some(fullname.to_string());
        self
    }

    pub fn hashed_password(mut self, hashed_password: &str) -> Self {
        self.hashed_password = Some(hashed_password.to_string());
        self
    }

    pub fn is_active(mut self, is_active: bool) -> Self {
        self.is_active = is_active;
        self
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        _fixture_context: &FixtureContext,
    ) -> UserContext {
        // TODO: Move validations to domain level
        // TODO: Full name should be validated if it is required or not
        let username = self.username.unwrap();
        let fullname = self.fullname;
        let req = CreateUserRequest {
            username: username.clone(),
            fullname: fullname.clone(),
            temp_password: String::new(),
            role: self.role.unwrap(),
        };
        req.validate().unwrap();

        let user = user_repo::create(
            conn,
            &username,
            fullname.as_deref(),
            // Admin1Password01 <-- TODO: change
            &HashedPassword::from(self.hashed_password.unwrap()),
            false,
            self.role.unwrap(),
        )
        .await
        .unwrap();

        if self.is_active {
            user_repo::update_last_activity_at(&mut *conn, user.id())
                .await
                .unwrap();
        }

        UserContext {
            user,
            plain_password: String::new(), // TODO: set the actual plain password if needed
        }
    }
}

#[derive(strum::VariantArray)]
pub enum UserFixture {
    // TODO: rename to CoordinatorGSB etc.
    Admin1,
    Admin2,
    Coordinator1,
    Coordinator2,
    Typist1,
    Typist2,
    Coordinator3,
    Coordinator4,
    Typist3,
    Typist4,
    Coordinator5,
    Coordinator6,
    Typist5,
    Typist6,
}
