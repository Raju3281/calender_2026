export const config = {
  runtime: "nodejs",
};

import * as Astronomy from "astronomy-engine";

export default async function handler(req, res) {
  const now = new Date();

  const sun = Astronomy.Equator(
    Astronomy.Body.Sun,
    now,
    Astronomy.Observer(17.385, 78.486, 0),
    true,
    true
  );

  res.json({
    node: process.version,
    sunRA: sun.ra,
    sunDec: sun.dec,
  });
}
