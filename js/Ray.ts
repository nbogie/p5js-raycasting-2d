interface RenderingOptions {
  drawGhostRay: boolean;
  drawRayToFirstIntersection: boolean;
  drawAllIntersections: boolean;
  drawFirstIntersection: boolean;
}
const defaultRenderingOptions: RenderingOptions = {
  drawGhostRay: false,
  drawRayToFirstIntersection: true,
  drawAllIntersections: false,
  drawFirstIntersection: true
};
let renderingOptions: RenderingOptions = randomRenderingOptions();

function randomiseRenderingOptions() {
  renderingOptions = randomRenderingOptions();
}

function randomRenderingOptions() {
  return {
    drawGhostRay: randomBoolean(),
    drawRayToFirstIntersection: randomBoolean(),
    drawAllIntersections: randomBoolean(),
    drawFirstIntersection: randomBoolean()
  };
}
interface IntersectionPoint {
  pt: p5.Vector;
  color: p5.Color;
}

interface RayOptions {
  angleRads?: number;
  target?: p5.Vector; //TODO: exactly one of target and angleRads is required.
  walls?: Wall[];
}

class Ray {
  //TODO: split this out into an agent which has an origin and a ray, with the ray handling only handling deciding line of sight and intersection points.

  origin: p5.Vector;

  //ray is conceptually infinite length with only one end, but this hack is useful for intersection and rendering.
  farEnd: p5.Vector; //a hack.  offscreen "far end".

  angleRads: p5.Vector;
  intersectionPoints: IntersectionPoint[];

  constructor(
    origin: p5.Vector,
    { angleRads = null, target = null, walls = [] }: RayOptions
  ) {
    this.origin = origin.copy();
    if (target !== null) {
      this.lookAt(target);
    } else {
      this.angleRads = p5.Vector.fromAngle(angleRads);
    }
    this.intersectionPoints = [];
    this.recalculateFarEnd();
    if (walls.length > 0) {
      this.recalculateIntersections(walls);
    }
  }

  lookAt(targetPos: p5.Vector): void {
    const deltaToTarget = targetPos.copy().sub(this.origin);
    //note: param order: y then x
    const angleToTarget = atan2(deltaToTarget.y, deltaToTarget.x);
    this.angleRads = p5.Vector.fromAngle(angleToTarget);
    this.recalculateFarEnd();
  }

  static createRandom(): Ray {
    return new Ray(randomScreenPosition(), { angleRads: random(0, TWO_PI) });
  }
  intersectionWithWall(wall: Wall): p5.Vector {
    //TODO: customise a fn to collideLineSegWithRay,
    //rather than LineSeg with LineSeg
    const answer = collideLineLine(
      wall.a.x,
      wall.a.y,
      wall.b.x,
      wall.b.y,
      this.origin.x,
      this.origin.y,
      this.farEnd.x,
      this.farEnd.y
    );

    return answer;
  }

  nearestIntersection(): IntersectionPoint {
    if (this.intersectionPoints.length > 0) {
      return minBy(
        this.intersectionPoints,
        ({ pt, color }: IntersectionPoint) => -this.origin.dist(pt)
      );
    } else {
      return undefined;
    }
  }
  calculateIntersections(walls: Wall[]): IntersectionPoint[] {
    const res: IntersectionPoint[] = [];
    for (let wall of walls) {
      const intersection = this.intersectionWithWall(wall);
      if (intersection) {
        res.push({ pt: intersection, color: wall.myColor });
      }
    }
    return res;
  }
  recalculateIntersections(walls: Wall[]): void {
    this.intersectionPoints = this.calculateIntersections(walls);
  }

  recalculateFarEnd(): void {
    this.farEnd = this.origin.copy().add(this.angleRads.copy().mult(width));
  }

  drawLitLineSegment(a: p5.Vector, b: p5.Vector): void {
    stroke("white");
    line(a.x, a.y, b.x, b.y);
  }

  drawRayUntilFirstIntersection(): void {
    const o = this.origin;
    const end = o.copy().add(this.angleRads.copy().mult(40));

    //draw to far (off-screen) end
    if (renderingOptions.drawGhostRay) {
      stroke(255, 255, 255, 10);
      strokeWeight(0.3);
      line(o.x, o.y, this.farEnd.x, this.farEnd.y);
    }
    const { pt, color } = this.nearestIntersection();
    if (renderingOptions.drawRayToFirstIntersection) {
      if (pt) {
        stroke(color);
        strokeWeight(2);
        this.drawLitLineSegment(o, pt);
      }
    }

    if (renderingOptions.drawAllIntersections) {
      for (let { pt, color } of this.intersectionPoints) {
        fill("white");
        circle(pt.x, pt.y, 2);
      }
    }

    if (renderingOptions.drawFirstIntersection) {
      const first = this.nearestIntersection();
      if (first) {
        noStroke();
        fill(first.color);
        circle(first.pt.x, first.pt.y, 6);
      }
    }
  }
  canSeePoint(target: p5.Vector): boolean {
    const nearestIsect: IntersectionPoint = this.nearestIntersection();
    const distToTarget = this.origin.dist(target);
    return !(nearestIsect && this.origin.dist(nearestIsect.pt) < distToTarget);
  }
}
