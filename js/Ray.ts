interface RayOptions {
  angleRads?: number;
  target?: p5.Vector; //TODO: exactly one of target and angleRads is required.
  walls?: Wall[];
}
class Ray {
  //TODO: split this out into an agent which has an origin and a ray, with the ray handling only handling deciding line of sight and intersection points.
  static isRenderAsCobweb = false;
  static isDrawGhostRay: boolean = true;
  static isDrawRayToFirstIntersection: boolean = true;
  static isDrawIntersections: boolean = false;

  origin: p5.Vector;

  //ray is conceptually infinite length with only one end, but this hack is useful for intersection and rendering.
  farEnd: p5.Vector; //a hack.  offscreen "far end".

  angleRads: p5.Vector;
  intersectionPoints: p5.Vector[];

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

  nearestIntersection(): p5.Vector {
    if (this.intersectionPoints.length > 0) {
      return minBy(
        this.intersectionPoints,
        (pt: p5.Vector) => -this.origin.dist(pt)
      );
    } else {
      return undefined;
    }
  }
  calculateIntersections(walls: Wall[]): p5.Vector[] {
    const res: p5.Vector[] = [];
    for (let wall of walls) {
      const intersection = this.intersectionWithWall(wall);
      if (intersection) {
        res.push(intersection);
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
    if (Ray.isRenderAsCobweb) {
      for (let i = 0; i < 20; i++) {
        const pt = a.copy().lerp(b, i / 10);
        square(pt.x, pt.y, 1);
      }
    } else {
      line(a.x, a.y, b.x, b.y);
    }
  }

  drawRayUntilFirstIntersection(): void {
    const o = this.origin;
    const end = o.copy().add(this.angleRads.copy().mult(40));

    //draw to far (off-screen) end
    if (Ray.isDrawGhostRay) {
      stroke(255, 255, 255, 10);
      strokeWeight(0.3);
      line(o.x, o.y, this.farEnd.x, this.farEnd.y);
    }
    const nearPt = this.nearestIntersection();
    if (Ray.isDrawRayToFirstIntersection) {
      if (nearPt) {
        stroke("white");
        strokeWeight(2);
        this.drawLitLineSegment(o, nearPt);
      }
    }

    if (Ray.isDrawIntersections) {
      for (let iPt of this.intersectionPoints) {
        fill("gray");
        circle(iPt.x, iPt.y, 2);
      }
      const first = this.nearestIntersection();
      if (first) {
        fill("white");
        circle(first.x, first.y, 2);
      }
    }
  }
  canSeePoint(target: p5.Vector): boolean {
    const nearestIsect: p5.Vector = this.nearestIntersection();
    const distToTarget = this.origin.dist(target);
    return nearestIsect && this.origin.dist(nearestIsect) < distToTarget;
  }
}
