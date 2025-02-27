INSERT INTO users (id, username, fullname, role, password_hash)
-- Passwords:
-- admin: 'AdminPassword01'
-- typist: 'TypistPassword01'
-- coordinator: 'CoordinatorPassword01'
VALUES (1, 'admin', 'Sanne Molenaar', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$QUKK7UVINt+ORMFA+7egeQ$iWQBzhaWH5NupuTSJA5jzxC20y/SH8j53rdz5YTema4'),
       (2, 'typist', 'Sam Kuijpers', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$Er+VXYLcGjIJL8i1aCUofA$fjT6Cp1tNr0HhI+LUE+hZG8GnvZI+m9qNXr6mcyJzQM'),
       (3, 'coordinator', 'Mohammed van der Velden', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$M3/ivnARZ5AHMGIAIc+hpA$AUNjzm2yEWIkMlaam8BKFxr4gv3TbU+nyiAcSZrmfoM');
