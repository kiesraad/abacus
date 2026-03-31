INSERT INTO users (id, username, fullname, role, password_hash, needs_password_change, last_activity_at)
-- Passwords:
-- admin1: 'Admin1Password01'
-- admin2: 'Admin2Password01'
-- coordinator1: 'Coordinator1Password01'
-- coordinator2: 'Coordinator2Password01'
-- typist1: 'Typist1Password01'
-- typist2: 'Typist2Password01'
-- coordinator3: 'Coordinator3Password03'
-- coordinator4: 'Coordinator4Password04'
-- typist3: 'Typist3Password03'
-- typist4: 'Typist4Password04'
VALUES (1, 'admin1', 'Sanne Molenaar', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$trZGY1jE5OSpt+NG9NvY1w$vofrcEyML5A70ZR6EhwdqfLsv81DjkYMJvgXeKFLqQ4', false, CURRENT_TIMESTAMP),
       (2, 'admin2', 'Jef van Reybrouck', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$T3GsSA2b0DoADC99nNvUiQ$aFbvgSyHJwEly0s88XypgceNNXtJVhBmCD5Eu9/xD7I', false, CURRENT_TIMESTAMP),
       (3, 'coordinator1', 'Mohammed van der Velden', 'coordinator_gsb', '$argon2id$v=19$m=19456,t=2,p=1$D6QmytaEld06P+sZ1p5osg$RqPv1nE7sosIeEoAl9wA96dC1R9RTO9om9aOYZPi3iw', false, NULL),
       (4, 'coordinator2', 'Mei Chen', 'coordinator_gsb', '$argon2id$v=19$m=19456,t=2,p=1$wgaSTPo3hhk3RTR9eDf/TQ$2wi/gsHEDslt1cqoWzL1zS07Y+5tlYg4V/lp2ZYcS5g', false, NULL),
       (5, 'typist1', 'Sam Kuijpers', 'typist_gsb', '$argon2id$v=19$m=19456,t=2,p=1$xQo7+6SEm9qRdViNg3/hsg$nA926/HWrQfih8xx5NPR5PXvtE2DqndImHiPWP7HDdQ', false, NULL),
       (6, 'typist2', 'Aliyah van den Berg', 'typist_gsb', '$argon2id$v=19$m=19456,t=2,p=1$wQphZULq5ttINkUDRTSzow$vUVBCYFJOaEMWUYiI0kYLgtlPACYXwikuxWfj+0QM9o', false, NULL),
       (7, 'coordinator3', 'John Doe', 'coordinator_csb', '$argon2id$v=19$m=19456,t=2,p=1$xy1C66/T3FaLHuvcA9hFKg$3SYm29uxBqHDY2nJjm1vC130lIBOC/pNcid4aqF/9qs', false, NULL),
       (8, 'coordinator4', 'Jane Doe', 'coordinator_csb', '$argon2id$v=19$m=19456,t=2,p=1$RKS2dISB4DeyPS6uz+h83g$R6Q8fWkF8L2H0wmqwkT3zsAGSL3JiOyGhAp402gxp9g', false, NULL),
       (9, 'typist3', 'Henry Smith', 'typist_csb', '$argon2id$v=19$m=19456,t=2,p=1$C4oIGknbccexw5jrLQJfNA$V9FrzbtEnuBv+lOAV9AtiHSo/u7y/FMGfekA3PS4zNs', false, NULL),
       (10, 'typist4', 'Alice Smith', 'typist_csb', '$argon2id$v=19$m=19456,t=2,p=1$jQfNR2cC7cwOL9ZDaMOArw$lPfXNrk0T3bAyzkKzM28JsuE4xt+2+qXPRhswl+FrhQ', false, NULL);
