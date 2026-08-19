INSERT INTO elections (id, name, committee_category, counting_method, election_id, location, authority_id, authority_name, authority_region, district, domain, category, sub_category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
-- number_of_seats explicitly set to a value less than 19, to be used in elections with less than 19 seats
VALUES (11, 'Waterschap Rivier en Polder 2026', 'GSB', 'DSO', 'AB2026_Heemdamseburg', 'Heemdamseburg', '0065', 'Heemdamseburg', 'Heemdamseburg', '{"district":"None"}', '{"id":"10","name":"Rivier en Polder"}', 'WaterAuthority', 'AB1', 15, 2000, '2026-11-30', '2026-11-01',
        '[
          {
            "number": 1,
            "registered_name": "Political Group A",
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
            "registered_name": "Political Group B",
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
VALUES (11, 1, 11, 'data_entry', 'Heemdamseburg', '2024-12-05 09:15:00');

INSERT INTO data_entries (id, state, updated_at)
VALUES (1101, '{"status":"Empty"}', '2024-12-05 09:15:00'),
       (1102, '{"status":"Empty"}', '2024-12-05 09:15:00');

INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, data_entry_id, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (1111, 11, NULL, 1101, 'Op Rolletjes', 33, NULL, 'Mobile', 'Rijksweg A12 1', '1234 YQ', 'Heemdamseburg'),
       (1112, 11, NULL, 1102, 'Testplek', 34, 1000, 'Special', 'Teststraat 2b', '1234 QY', 'Heemdamseburg');
