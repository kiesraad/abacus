INSERT INTO elections (id, name, counting_method, election_id, location, domain_id, category, number_of_seats, election_date, nomination_date, political_groups)
VALUES (3, 'Municipal Re-election', 'CSO', 'Heemdamseburg_2024', 'Heemdamseburg', '0000', 'Municipal', 29, '2024-12-31', '2024-12-1',
        '[
          {
            "number": 1,
            "name": "Political Group A",
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

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date, start_time)
VALUES (3, 1, 3, 'data_entry_in_progress','', '', '');


INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (3, 3, 'Testgebouw', 35, NULL, 'FixedLocation', 'Testweg 3', '1234 QA', 'Teststad');
