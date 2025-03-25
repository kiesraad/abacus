import { describe, expect, test } from "vitest";

import { localDateToUtc, utcToLocalDate } from "./date";

describe("date", () => {
  test("localDateToUtc", () => {
    expect(localDateToUtc("Tue Dec 08 2020 12:32:56 GMT+0100 (Central European Standard Time)")).toBe(
      "2020-12-08T11:32:56.000Z",
    );
    expect(localDateToUtc("Mon Feb 27 2012 07:53:44 GMT+0100 (Central European Standard Time)")).toBe(
      "2012-02-27T06:53:44.000Z",
    );
    expect(localDateToUtc("Mon Feb 03 2020 20:01:28 GMT+0100 (Central European Standard Time)")).toBe(
      "2020-02-03T19:01:28.000Z",
    );
    expect(localDateToUtc("Wed Oct 23 2024 00:49:04 GMT+0200 (Central European Summer Time)")).toBe(
      "2024-10-22T22:49:04.000Z",
    );
    expect(localDateToUtc("Tue Jan 08 2019 20:31:06 GMT+0100 (Central European Standard Time)")).toBe(
      "2019-01-08T19:31:06.000Z",
    );
    expect(localDateToUtc("Mon Oct 20 2014 05:01:29 GMT+0200 (Central European Summer Time)")).toBe(
      "2014-10-20T03:01:29.000Z",
    );
    expect(localDateToUtc("Thu Mar 08 2012 10:30:36 GMT+0100 (Central European Standard Time)")).toBe(
      "2012-03-08T09:30:36.000Z",
    );
    expect(localDateToUtc("Thu Jan 25 2024 04:25:02 GMT+0100 (Central European Standard Time)")).toBe(
      "2024-01-25T03:25:02.000Z",
    );
    expect(localDateToUtc("Sat Sep 14 2013 13:17:04 GMT+0200 (Central European Summer Time)")).toBe(
      "2013-09-14T11:17:04.000Z",
    );
    expect(localDateToUtc("Wed Sep 07 2016 00:58:29 GMT+0200 (Central European Summer Time)")).toBe(
      "2016-09-06T22:58:29.000Z",
    );
  });

  test("utcToLocalDate", () => {
    expect(utcToLocalDate("2020-12-08T11:32:56Z")).toBe("2020-12-08T12:32:56+01:00");
    expect(utcToLocalDate("2012-02-27T06:53:44Z")).toBe("2012-02-27T07:53:44+01:00");
    expect(utcToLocalDate("2020-02-03T19:01:28Z")).toBe("2020-02-03T20:01:28+01:00");
    expect(utcToLocalDate("2024-10-22T22:49:04Z")).toBe("2024-10-23T00:49:04+02:00");
    expect(utcToLocalDate("2019-01-08T19:31:06Z")).toBe("2019-01-08T20:31:06+01:00");
    expect(utcToLocalDate("2014-10-20T03:01:29Z")).toBe("2014-10-20T05:01:29+02:00");
    expect(utcToLocalDate("2012-03-08T09:30:36Z")).toBe("2012-03-08T10:30:36+01:00");
    expect(utcToLocalDate("2024-01-25T03:25:02Z")).toBe("2024-01-25T04:25:02+01:00");
    expect(utcToLocalDate("2013-09-14T11:17:04Z")).toBe("2013-09-14T13:17:04+02:00");
    expect(utcToLocalDate("2016-09-06T22:58:29Z")).toBe("2016-09-07T00:58:29+02:00");
  });
});
