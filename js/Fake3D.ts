//TODO: namespace this
interface DistancesBuffer {
  values: number[];
}
function makeDistancesBuffer(rays: Ray[]): DistancesBuffer {
  //const fakeData = generateFakeData(40);
  return generateDataFromRays(rays);
}
function generateDataFromRays(rays: Ray[]): DistancesBuffer {
  return {
    values: rays.map(ray => {
      const pt = ray.nearestIntersection();
      return pt ? pt.mag() : width;
    })
  };
}
function generateFakeData(numStrips: number): DistancesBuffer {
  const buff: number[] = [];
  repeat(numStrips, ix => {
    buff.push(noise(ix / 20, frameCount / 200) * width);
  });
  return { values: buff };
}

function drawDistancesBuffer(dists: DistancesBuffer) {
  const numStrips = dists.values.length;
  const stripWidth = width / numStrips;
  dists.values.forEach((dist, ix) => {
    const x = ix * stripWidth;
    const y = map(dist, 0, width, height, 0);
    noStroke();
    rectMode(CENTER);
    rect(x, height / 2, stripWidth, y);
  });
}
