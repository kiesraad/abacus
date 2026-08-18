INSERT INTO elections (id, name, committee_category, counting_method, election_id, location, authority_id, authority_name, authority_region, district, domain, category, sub_category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
VALUES (6, 'Nieuwe Verkiezing', 'GSB', 'CSO','GR2024_KleinDorp', 'Klein Dorp', '0123', 'Klein Dorp', 'Klein Dorp', '{"district":"None"}', '{"id":"0123","name":"Klein Dorp"}', 'Municipal', 'GR2', 29, 2500, '2024-12-31', '2024-12-01',
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
                "locality": "Klein Dorp",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Klein Dorp",
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
                "locality": "Klein Dorp",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Klein Dorp",
                "gender": null
              }
            ]
          }
        ]');

INSERT INTO committee_sessions (id, number, election_id, location, start_date_time)
VALUES (7, 1, 6,'', NULL);
