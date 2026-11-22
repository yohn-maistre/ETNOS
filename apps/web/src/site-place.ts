/**
 * Where this deployment's sky and day/night rhythm come from.
 *
 * Another community deploying ETNOS replaces these values with its own. Star
 * figures are drawn only from what a deployment declares here; none are
 * implied by the engine. Positions are J2000 right ascension (hours) and
 * declination (degrees).
 */
export type SkyFigure = {
  /** Shown to screen readers only; leave empty to keep a figure unnamed. */
  name: string
  stars: [ra: number, dec: number][]
  /** Pairs of indexes into `stars` joined by a faint line. */
  lines: [number, number][]
}

export const sitePlace = {
  label: 'Jayapura',
  latitude: -2.533,
  longitude: 140.717,
  /**
   * Figures drawn as plain lines without names, checked against the Yale
   * Bright Star Catalogue. Scorpius's tail is the fishhook many Pacific
   * peoples know. A community can replace these with its own star knowledge.
   */
  figures: [
    {
      name: 'Orion',
      stars: [
        [5.919, 7.407],
        [5.419, 6.35],
        [5.679, -1.943],
        [5.604, -1.202],
        [5.533, -0.299],
        [5.796, -9.67],
        [5.242, -8.202],
      ],
      lines: [
        [0, 1],
        [0, 2],
        [1, 4],
        [2, 3],
        [3, 4],
        [2, 5],
        [4, 6],
      ],
    },
    {
      name: 'Scorpius',
      stars: [
        [16.091, -19.806],
        [16.006, -22.622],
        [15.981, -26.114],
        [16.353, -25.593],
        [16.49, -26.432],
        [16.598, -28.216],
        [16.836, -34.293],
        [16.865, -38.047],
        [16.91, -42.361],
        [17.203, -43.239],
        [17.622, -42.998],
        [17.793, -40.127],
        [17.708, -39.03],
        [17.56, -37.104],
      ],
      lines: [
        [0, 1],
        [1, 2],
        [1, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        [12, 13],
      ],
    },
    {
      name: 'Crux',
      stars: [
        [12.443, -63.099],
        [12.519, -57.113],
        [12.795, -59.689],
        [12.252, -58.749],
      ],
      lines: [
        [0, 1],
        [2, 3],
      ],
    },
  ] satisfies SkyFigure[],
}
