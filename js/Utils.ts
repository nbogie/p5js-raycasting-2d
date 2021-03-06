function randomScreenPosition(): p5.Vector {
  return createVector(random(width), random(height));
}

function centerScreenPos(): p5.Vector {
  return createVector(width / 2, height / 2);
}

function randomInt(min: number, max: number): number {
  return round(random(min, max));
}

function translateToVec(pos: p5.Vector): void {
  translate(pos.x, pos.y);
}
function rotateVertexAround(
  vertex: p5.Vector,
  rotOrigin: p5.Vector,
  angleRad: number
): p5.Vector {
  return vertex
    .copy()
    .sub(rotOrigin)
    .rotate(angleRad)
    .add(rotOrigin);
}

//Taken from https://github.com/bmoren/p5.collide2D
function collideLineLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
) {
  // calculate the distance to intersection point
  let uA =
    ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) /
    ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
  let uB =
    ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) /
    ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

  // if uA and uB are between 0-1, lines are colliding
  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    // calc the point where the lines meet
    let intersectionX = x1 + uA * (x2 - x1);
    let intersectionY = y1 + uA * (y2 - y1);

    return createVector(intersectionX, intersectionY);
  }
  return null;
}

/** Find the minimum of the given list after applying fn() to each.
 * Return the minimum, first minimum, or undefined if there are no items.
 */
function minBy<T>(list: T[], fn: (item: T) => number): T {
  if (list.length < 0) {
    return undefined;
  }
  let recordItem = list[0];
  let recordWeight = fn(list[0]);
  for (let item of list) {
    const weight = fn(item);
    if (weight > recordWeight) {
      recordWeight = weight;
      recordItem = item;
    }
  }
  return recordItem;
}

/** Repeatedly call the given function fn, num times, throwing any output away. */
function repeat(num: number, fn: (ix: number) => void) {
  for (let i = 0; i < num; i++) {
    fn(i);
  }
}

function distributeUpTo(total: number, max: number, fn: (v: number) => void) {
  repeat(total, ix => {
    const val = (ix * max) / total;
    return fn(val);
  });
}
/** 
Collect a set of values generated with fn called with 
a range of numSamples samples distributed evenly from min to max.
*/
function collectDistributedBetween<T>(
  numSamples: number,
  min: number,
  max: number,
  fn: (v: number) => T
): T[] {
  const result: T[] = [];
  distributeBetween(numSamples, min, max, v => result.push(fn(v)));
  return result;
}
function distributeBetween(
  numSamples: number,
  min: number,
  max: number,
  fn: (v: number) => void
) {
  repeat(numSamples, ix => {
    const range = max - min;
    const val = min + (ix * range) / numSamples;
    return fn(val);
  });
}
function averageVectors(vs: p5.Vector[]): p5.Vector {
  if (vs.length < 1) {
    return createVector(0, 0);
  }
  return vs.reduce((v1, v2) => v1.copy().add(v2), vs[0]).div(vs.length);
}

//TODO: don't pollute global
const gLastMouseMovements: p5.Vector[] = [];

//TODO: smooth this out by buffering a few movements
//Maintain the previous angle if there's been no movement
function angleOfLastMouseMovement(): number {
  const delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
  if (delta.magSq() < 1) {
    return undefined;
  } else {
    gLastMouseMovements.unshift(delta);
    gLastMouseMovements.splice(8);
    const avgMovement = averageVectors(gLastMouseMovements);

    //average might have cancelled out and therefore have no heading
    if (avgMovement.mag() > 0) {
      return avgMovement.heading();
    } else {
      return undefined;
    }
  }
}

function randomBoolean(): boolean {
  return Math.random() > 0.5;
}
function mousePosAsVector(): p5.Vector {
  return createVector(mouseX, mouseY);
}
