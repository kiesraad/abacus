INSERT INTO users (id, username, fullname, role, password_hash)
-- password is 'password'
VALUES (1, 'admin', 'Sanne Molenaar', 'administrator', '$argon2id$v=19$m=19456,t=2,p=1$frZGxFIhMHEsBJS4/VZr1A$zVIGEmiTFGy9jEy1Bphdq1ZO0lUngom8qu9PLsN6mZY'),
       (2, 'typist', 'Sam Kuijpers', 'typist', '$argon2id$v=19$m=19456,t=2,p=1$frZGxFIhMHEsBJS4/VZr1A$zVIGEmiTFGy9jEy1Bphdq1ZO0lUngom8qu9PLsN6mZY'),
       (3, 'coordinator', 'Mohammed van der Velden', 'coordinator', '$argon2id$v=19$m=19456,t=2,p=1$frZGxFIhMHEsBJS4/VZr1A$zVIGEmiTFGy9jEy1Bphdq1ZO0lUngom8qu9PLsN6mZY');
