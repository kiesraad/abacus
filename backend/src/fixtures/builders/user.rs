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

impl UserBuilder {
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
