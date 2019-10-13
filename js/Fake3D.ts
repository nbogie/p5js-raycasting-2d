//TODO: namespace this

interface DistantPoint {
  distance: number;
  //TODO: this could just be a collection of data about the object it hit (object id, color, surface normal, illumination, texture, height)
  color: p5.Color;
}

interface DistancesBuffer {
  values: DistantPoint[];
}

function makeDistancesBuffer(rays: Ray[]): DistancesBuffer {
  return generateDataFromRays(rays);
}

function colorForPoint(
  { color: c, pt }: IntersectionPoint,
  origin: p5.Vector
): p5.Color {
  const dist = origin.dist(pt);
  const lightness = map(dist, 0, width, 50, 3);
  colorMode(RGB);
  const [h, s] = [hue(c), saturation(c)];
  colorMode(HSL, 100);
  return color(h, s, lightness);
}

function generateDataFromRays(rays: Ray[]): DistancesBuffer {
  return {
    values: rays.map(ray => {
      const nearest = ray.nearestIntersection();
      return nearest
        ? {
            distance: nearest.pt.dist(ray.origin),
            color: colorForPoint(nearest, ray.origin)
          }
        : { distance: width * 1.5, color: color("black") };
    })
  };
}

function drawDistancesBuffer(distantPoints: DistancesBuffer) {
  const numStrips = distantPoints.values.length;
  const stripSpacing = width / numStrips;
  const stripWidth = ceil(stripSpacing);

  distantPoints.values.forEach(({ distance, color }, ix) => {
    const x = ix * stripWidth;
    const distSq = distance ^ 2;
    const maxHeight = height * 0.7;
    const maxHeightSq = maxHeight ^ 2;
    const y = map(distSq, 0, width, maxHeightSq, 0);

    noStroke();
    fill(color);
    rectMode(CENTER);
    rect(x, height / 2, stripWidth, y);
  });
}
