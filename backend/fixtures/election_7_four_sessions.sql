INSERT INTO elections (id, name, counting_method, election_id, location, domain_id, category, number_of_seats, number_of_voters, election_date, nomination_date, political_groups)
VALUES (7, 'Test Election >= 19 seats', 'CSO', 'GroteStad_2026', 'Grote Stad', '0000', 'Municipal', 23, 15000, '2026-03-18', '2026-02-02',
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

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date_time)
VALUES (701, 1, 7, 'completed', 'Grote Stad', '2026-03-19 09:15:00'),
       (702, 2, 7, 'completed', 'Grote Stad', '2026-03-19 17:15:00'),
       (703, 3, 7, 'completed', 'Grote Stad', '2026-03-19 23:15:00'),
       (704, 4, 7, 'created', '', NULL);

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

INSERT INTO
    polling_station_investigations
VALUES
    (721, "reason", "findings", 1),
    (732, "reason", "findings", 1);

INSERT INTO
    polling_station_data_entries
VALUES (711, 701,
        '{"status":"Definitive","state":{"first_entry_user_id":5,"second_entry_user_id":6,"finished_at":"2026-03-19T09:15:31.223365436Z","finalised_with_warnings":false}}',
        '2026-03-19 09:15:31'),
       (712, 701,
        '{"status":"Definitive","state":{"first_entry_user_id":5,"second_entry_user_id":6,"finished_at":"2026-03-19T09:45:31.223365436Z","finalised_with_warnings":false}}',
        '2026-03-19 09:45:31'),
       (721, 702,
        '{"status":"Definitive","state":{"first_entry_user_id":5,"second_entry_user_id":6,"finished_at":"2026-03-19T17:15:31.223365436Z","finalised_with_warnings":false}}',
        '2026-03-19 17:15:31'),
       (732, 703,
        '{"status":"Definitive","state":{"first_entry_user_id":5,"second_entry_user_id":6,"finished_at":"2026-03-19T23:45:31.223365436Z","finalised_with_warnings":false}}',
        '2026-03-19 23:45:31');

INSERT INTO
    polling_station_results
VALUES
    -- Results differ by proxy_certificate_count 
    (711, 701, '{"model":"CSOFirstSession","extra_investigation":{"extra_investigation_other_reason":{"yes":false,"no":false},"ballots_recounted_extra_investigation":{"yes":false,"no":false}},"counting_differences_polling_station":{"unexplained_difference_ballots_voters":{"yes":false,"no":true},"difference_ballots_per_list":{"yes":false,"no":true}},"voters_counts":{"poll_card_count":296,"proxy_certificate_count":1,"total_admitted_voters_count":297},"votes_counts":{"political_group_total_votes":[{"number":1,"total":200},{"number":2,"total":92}],"total_votes_candidates_count":292,"blank_votes_count":3,"invalid_votes_count":2,"total_votes_cast_count":297},"differences_counts":{"compare_votes_cast_admitted_voters":{"admitted_voters_equal_votes_cast":true,"votes_cast_greater_than_admitted_voters":false,"votes_cast_smaller_than_admitted_voters":false},"more_ballots_count":0,"fewer_ballots_count":0,"difference_completely_accounted_for":{"yes":false,"no":false}},"political_group_votes":[{"number":1,"total":200,"candidate_votes":[{"number":1,"votes":150},{"number":2,"votes":50}]},{"number":2,"total":92,"candidate_votes":[{"number":1,"votes":80},{"number":2,"votes":12}]}]}', '2026-03-19 09:15:31'),
    (712, 701, '{"model":"CSOFirstSession","extra_investigation":{"extra_investigation_other_reason":{"yes":false,"no":false},"ballots_recounted_extra_investigation":{"yes":false,"no":false}},"counting_differences_polling_station":{"unexplained_difference_ballots_voters":{"yes":false,"no":true},"difference_ballots_per_list":{"yes":false,"no":true}},"voters_counts":{"poll_card_count":295,"proxy_certificate_count":2,"total_admitted_voters_count":297},"votes_counts":{"political_group_total_votes":[{"number":1,"total":200},{"number":2,"total":92}],"total_votes_candidates_count":292,"blank_votes_count":3,"invalid_votes_count":2,"total_votes_cast_count":297},"differences_counts":{"compare_votes_cast_admitted_voters":{"admitted_voters_equal_votes_cast":true,"votes_cast_greater_than_admitted_voters":false,"votes_cast_smaller_than_admitted_voters":false},"more_ballots_count":0,"fewer_ballots_count":0,"difference_completely_accounted_for":{"yes":false,"no":false}},"political_group_votes":[{"number":1,"total":200,"candidate_votes":[{"number":1,"votes":150},{"number":2,"votes":50}]},{"number":2,"total":92,"candidate_votes":[{"number":1,"votes":80},{"number":2,"votes":12}]}]}', '2026-03-19 09:45:31'),
    (721, 702, '{"model":"CSONextSession","voters_counts":{"poll_card_count":294,"proxy_certificate_count":3,"total_admitted_voters_count":297},"votes_counts":{"political_group_total_votes":[{"number":1,"total":200},{"number":2,"total":92}],"total_votes_candidates_count":292,"blank_votes_count":3,"invalid_votes_count":2,"total_votes_cast_count":297},"differences_counts":{"compare_votes_cast_admitted_voters":{"admitted_voters_equal_votes_cast":true,"votes_cast_greater_than_admitted_voters":false,"votes_cast_smaller_than_admitted_voters":false},"more_ballots_count":0,"fewer_ballots_count":0,"difference_completely_accounted_for":{"yes":false,"no":false}},"political_group_votes":[{"number":1,"total":200,"candidate_votes":[{"number":1,"votes":150},{"number":2,"votes":50}]},{"number":2,"total":92,"candidate_votes":[{"number":1,"votes":80},{"number":2,"votes":12}]}]}', '2026-03-19 17:15:31'),
    (732, 703, '{"model":"CSONextSession","voters_counts":{"poll_card_count":293,"proxy_certificate_count":4,"total_admitted_voters_count":297},"votes_counts":{"political_group_total_votes":[{"number":1,"total":200},{"number":2,"total":92}],"total_votes_candidates_count":292,"blank_votes_count":3,"invalid_votes_count":2,"total_votes_cast_count":297},"differences_counts":{"compare_votes_cast_admitted_voters":{"admitted_voters_equal_votes_cast":true,"votes_cast_greater_than_admitted_voters":false,"votes_cast_smaller_than_admitted_voters":false},"more_ballots_count":0,"fewer_ballots_count":0,"difference_completely_accounted_for":{"yes":false,"no":false}},"political_group_votes":[{"number":1,"total":200,"candidate_votes":[{"number":1,"votes":150},{"number":2,"votes":50}]},{"number":2,"total":92,"candidate_votes":[{"number":1,"votes":80},{"number":2,"votes":12}]}]}', '2026-03-19 23:45:31');
