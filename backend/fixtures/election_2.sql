INSERT INTO elections (id, name, committee_category, counting_method, election_id, location, domain_id, category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
-- number_of_seats explicitly set to a value less than 19, to be used in elections with less than 19 seats
VALUES (2, 'Municipal Election', 'GSB', 'CSO', 'GR2024_Heemdamseburg', 'Heemdamseburg', '0000', 'Municipal', 15, 2000, '2024-11-30', '2024-11-01',
        '[
          {
            "number": 1,
            "name": "Political Group A",
            "display_name": "Political Group A",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "first_name": "Alice",
                "last_name": "Foo",
                "locality": "Amsterdam",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Rotterdam",
                "gender": null
              }
            ]
          },{
            "number": 2,
            "name": "Political Group B",
            "display_name": "Political Group B",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "first_name": "Alice",
                "last_name": "Foo",
                "locality": "Amsterdam",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Rotterdam",
                "gender": null
              }
            ]
          }
        ]');

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date_time)
VALUES (2, 1, 2, 'data_entry', 'Heemdamseburg', '2024-12-05 09:15:00');

INSERT INTO data_entries (id, state, updated_at)
VALUES (201, '{"status":"Empty"}', '2024-12-05 09:15:00'),
       (202, '{"status":"Empty"}', '2024-12-05 09:15:00');

INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, data_entry_id, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (211, 2, NULL, 201, 'Op Rolletjes', 33, NULL, 'Mobile', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
       (212, 2, NULL, 202, 'Testplek', 34, 1000, 'Special', 'Teststraat 2b', '1234 QY', 'Testdorp');
