INSERT INTO elections (id, name, committee_category, counting_method, election_id, location, domain_id, category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
VALUES (8, 'Municipal Election', 'CSB', NULL, 'GR2024_Heemdamseburg', 'Heemdamseburg', '0042', 'Municipal', 15, 2000, '2024-11-30', '2024-11-01',
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
              }
            ]
          }
        ]');

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date_time)
VALUES (8, 1, 8, 'data_entry', 'Heemdamseburg', '2024-12-05 09:15:00');
