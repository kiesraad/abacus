INSERT INTO elections (id, name, counting_method, election_id, location, domain_id, category, number_of_seats, election_date, nomination_date, political_groups)
VALUES (700, 'Test Election >= 19 seats', 'CSO', 'GroteStad_2026', 'Grote Stad', '0000', 'Municipal', 23, '2026-03-18', '2026-02-02',
        '[
          {
            "number": 1,
            "name": "A",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "last_name": "A-Een",
                "locality": "Test",
                "gender": "X"
              },
              {
                "number": 2,
                "initials": "B.",
                "last_name": "A-Twee",
                "locality": "Test",
                "gender": "Male"
              }
            ]
          },
          {
            "number": 2,
            "name": "B",
            "candidates": [
              {
                "number": 1,
                "initials": "B.",
                "last_name": "B-Een",
                "locality": "Test",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "B.",
                "last_name": "B-Twee",
                "locality": "Test",
                "gender": "X"
              }
            ]
          }
        ]');

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date_time, number_of_voters)
VALUES (701, 1, 700, 'data_entry_finished', 'Grote Stad', '2026-03-19T09:15', 2000),
       (702, 2, 700, 'data_entry_finished', 'Grote Stad', '2026-03-19T17:15', 2000),
       (703, 2, 700, 'data_entry_finished', 'Grote Stad', '2026-03-19T23:15', 2000),
       (704, 3, 700, 'data_entry_in_progress', '', NULL, 2000);

INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (711, 701, NULL, 'TestA', 1, NULL, 'FixedLocation', 'Testweg 1a', '1234 AA', 'Grote Stad'),
       (712, 701, NULL, 'TestB', 2, NULL, 'FixedLocation', 'Testweg 1b', '1234 BB', 'Grote Stad'),
       (721, 702, 711,  'TestA', 1, NULL, 'FixedLocation', 'Testweg 1a', '1234 AA', 'Grote Stad'),
       (722, 702, 712,  'TestB', 2, NULL, 'FixedLocation', 'Testweg 1b', '1234 BB', 'Grote Stad'),
       (731, 703, 721,  'TestA', 1, NULL, 'FixedLocation', 'Testweg 1a', '1234 AA', 'Grote Stad'),
       (732, 703, 722,  'TestB', 2, NULL, 'FixedLocation', 'Testweg 1b', '1234 BB', 'Grote Stad'),
       (741, 704, 731,  'TestA', 1, NULL, 'FixedLocation', 'Testweg 1a', '1234 AA', 'Grote Stad'),
       (742, 704, 732,  'TestB', 2, NULL, 'FixedLocation', 'Testweg 1b', '1234 BB', 'Grote Stad');
