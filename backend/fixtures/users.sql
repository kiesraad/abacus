INSERT INTO users (id, username, fullname, role, password_hash, needs_password_change)
-- Passwords:
-- admin: 'AdminPassword01'
-- admin2: 'Admin2Password01'
-- coordinator: 'CoordinatorPassword01'
-- coordinator: 'Coordinator2Password01'
-- typist: 'TypistPassword01'
-- typist2: 'Typist2Password01'
VALUES (1, 'admin', 'Sanne Molenaar', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$QUKK7UVINt+ORMFA+7egeQ$iWQBzhaWH5NupuTSJA5jzxC20y/SH8j53rdz5YTema4', false),
       (2, 'admin2', 'Jef van Reybrouck', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$T3GsSA2b0DoADC99nNvUiQ$aFbvgSyHJwEly0s88XypgceNNXtJVhBmCD5Eu9/xD7I', false),
       (3, 'coordinator', 'Mohammed van der Velden', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$M3/ivnARZ5AHMGIAIc+hpA$AUNjzm2yEWIkMlaam8BKFxr4gv3TbU+nyiAcSZrmfoM', false),
       (4, 'coordinator2', 'Mei Chen', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$wgaSTPo3hhk3RTR9eDf/TQ$2wi/gsHEDslt1cqoWzL1zS07Y+5tlYg4V/lp2ZYcS5g', false),
       (5, 'typist', 'Sam Kuijpers', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$Er+VXYLcGjIJL8i1aCUofA$fjT6Cp1tNr0HhI+LUE+hZG8GnvZI+m9qNXr6mcyJzQM', false),
       (6, 'typist2', 'Aliyah van den Berg', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$wQphZULq5ttINkUDRTSzow$vUVBCYFJOaEMWUYiI0kYLgtlPACYXwikuxWfj+0QM9o', false);
