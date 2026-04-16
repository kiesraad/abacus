INSERT INTO elections (id, name, committee_category, counting_method, election_id, location, domain_id, category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
-- copy of election_3 with committee_category changed to 'CSB' and subcommittee instead of polling station
VALUES (10, 'Municipal Re-election', 'CSB', 'CSO', 'GR2024_Heemdamseburg', 'Heemdamseburg', '0000', 'Municipal', 29, 2000, '2024-12-31', '2024-12-01',
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
VALUES (1001, 1, 10, 'data_entry', '', NULL);

INSERT INTO data_entries (id, state, updated_at)
VALUES (1001, '{"status":"Empty"}', '2024-12-05 09:15:00');

INSERT INTO sub_committees (id, committee_session_id, data_entry_id, name, number, category)
VALUES (1011, 1001, 1001, 'Juinen', 1, 'GSB');
