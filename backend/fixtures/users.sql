INSERT INTO users (id, username, fullname, role, password_hash, needs_password_change, last_activity_at)
-- Passwords:
-- admin1: 'Admin1Password01'
-- admin2: 'Admin2Password01'
-- coordinator1: 'Coordinator1Password01'
-- coordinator2: 'Coordinator2Password01'
-- typist1: 'Typist1Password01'
-- typist2: 'Typist2Password01'
VALUES (1, 'admin1', 'Sanne Molenaar', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$trZGY1jE5OSpt+NG9NvY1w$vofrcEyML5A70ZR6EhwdqfLsv81DjkYMJvgXeKFLqQ4', false, CURRENT_TIMESTAMP),
       (2, 'admin2', 'Jef van Reybrouck', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$T3GsSA2b0DoADC99nNvUiQ$aFbvgSyHJwEly0s88XypgceNNXtJVhBmCD5Eu9/xD7I', false, CURRENT_TIMESTAMP),
       (3, 'coordinator1', 'Mohammed van der Velden', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$D6QmytaEld06P+sZ1p5osg$RqPv1nE7sosIeEoAl9wA96dC1R9RTO9om9aOYZPi3iw', false, NULL),
       (4, 'coordinator2', 'Mei Chen', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$wgaSTPo3hhk3RTR9eDf/TQ$2wi/gsHEDslt1cqoWzL1zS07Y+5tlYg4V/lp2ZYcS5g', false, NULL),
       (5, 'typist1', 'Sam Kuijpers', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$xQo7+6SEm9qRdViNg3/hsg$nA926/HWrQfih8xx5NPR5PXvtE2DqndImHiPWP7HDdQ', false, NULL),
       (6, 'typist2', 'Aliyah van den Berg', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$wQphZULq5ttINkUDRTSzow$vUVBCYFJOaEMWUYiI0kYLgtlPACYXwikuxWfj+0QM9o', false, NULL);
