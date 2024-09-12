-- Delete all data from the database in the correct order to avoid violating foreign key constraints
DELETE FROM polling_station_results;
DELETE FROM polling_station_data_entries;
DELETE FROM polling_stations;
DELETE FROM elections;
