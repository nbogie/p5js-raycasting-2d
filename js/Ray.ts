class Ray {
  //TODO: split this out into an agent which has an origin and a ray, with the ray handling only handling deciding line of sight and intersection points.
  isRenderAsCobweb = false;
  isDrawGhostRay: boolean = true;
  isDrawRayToFirstIntersection: boolean = true;
  isDrawIntersections: boolean = false;
  origin: p5.Vector;
  movementPhase: number;
  speed: number; // move out to particle of origin

  //ray is conceptually infinite length with only one end, but this hack is useful for intersection and rendering.
  farEnd: p5.Vector; //a hack.  offscreen "far end".

  dir: p5.Vector;
  intersectionPoints: p5.Vector[];

  constructor(origin: p5.Vector, angleRads: number) {
    this.origin = origin.copy();
    this.dir = p5.Vector.fromAngle(angleRads);
    this.intersectionPoints = [];
    this.recalculateFarEnd();
    this.movementPhase = random(10000);
    this.speed = 1;
  }

  setPosition(pos: p5.Vector) {
    this.origin.x = pos.x;
    this.origin.y = pos.y;
    this.recalculateFarEnd();
  }

  updateDirty(walls: Wall[]) {
    this.recalculateFarEnd();
    this.recalculateIntersections(walls);
  }
  lookAt(targetPos: p5.Vector) {
    const deltaToTarget = targetPos.copy().sub(this.origin);
    //note: param order: y then x
    const angleToTarget = atan2(deltaToTarget.y, deltaToTarget.x);
    this.dir = p5.Vector.fromAngle(angleToTarget);
    this.recalculateFarEnd();
  }

  static createRandom() {
    return new Ray(randomScreenPosition(), random(0, TWO_PI));
  }
  intersectionWithWall(wall: Wall): p5.Vector {
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

    if (answer) {
      return createVector(answer.x, answer.y);
    }
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
  recalculateIntersections(walls: Wall[]) {
    this.intersectionPoints = this.calculateIntersections(walls);
  }

  recalculateFarEnd(): void {
    this.farEnd = this.origin.copy().add(this.dir.copy().mult(width));
  }

  updateWithRoaming(walls: Wall[], mousePos: p5.Vector): void {
    let newPos: p5.Vector = null;

    const offset = createVector(0, 0);
    offset.x = map(
      noise(this.movementPhase + 33333 + frameCount / 100),
      0,
      1,
      -1,
      1
    );
    offset.y = map(noise(this.movementPhase + frameCount / 100), 0, 1, -1, 1);

    const attractVec = this.origin
      .copy()
      .sub(mousePosAsVector())
      .normalize();
    newPos = this.origin.copy().add(attractVec.mult(this.speed));

    newPos.add(offset);

    this.setPosition(newPos);
    this.lookAt(mousePos);
    this.updateDirty(walls);
    const newSpeed =
      this.speed + (this.canSeePoint(mousePosAsVector()) ? -0.1 : 0.1);
    if (Math.abs(newSpeed) < 3) {
      this.speed = newSpeed;
    }
  }
  drawLitLineSegment(a: p5.Vector, b: p5.Vector): void {
    if (this.isRenderAsCobweb) {
      for (let i = 0; i < 20; i++) {
        const pt = a.copy().lerp(b, i / 10);
        square(pt.x, pt.y, 1);
      }
    } else {
      line(a.x, a.y, b.x, b.y);
    }
  }

  drawRayUntilFirstIntersection() {
    const o = this.origin;
    const end = o.copy().add(this.dir.copy().mult(40));

    //draw to far (off-screen) end
    if (this.isDrawGhostRay) {
      stroke(255, 255, 255, 10);
      strokeWeight(0.3);
      line(o.x, o.y, this.farEnd.x, this.farEnd.y);
    }
    const nearPt = this.nearestIntersection();
    if (this.isDrawRayToFirstIntersection) {
      if (nearPt) {
        stroke("white");
        strokeWeight(2);
        this.drawLitLineSegment(o, nearPt);
      }
    }

    if (this.isDrawIntersections) {
      for (let iPt of this.intersectionPoints) {
        fill("green");
        circle(iPt.x, iPt.y, 2);
      }
      const first = this.nearestIntersection();
      if (first) {
        fill("white");
        circle(first.x, first.y, 2);
      }
    }
  }
  canSeePoint(target: p5.Vector) {
    const nearestIsect: p5.Vector = this.nearestIntersection();
    const distToTarget = this.origin.dist(target);
    return nearestIsect && this.origin.dist(nearestIsect) < distToTarget;
  }

  drawAgentCanSeePlayer() {
    const o = this.origin;
    const end = o.copy().add(this.dir.copy().mult(40));

    //draw start point
    noStroke();
    if (this.canSeePoint(mousePosAsVector())) {
      fill(0, 0, 0, 20);
      circle(o.x, o.y, 8);
    } else {
      const distToMousePointer = this.origin.dist(mousePosAsVector());
      const brightness = map(distToMousePointer, 0, max(width, height), 255, 0);
      const litColor: p5.Color = color(255, 255, 255, brightness);
      fill(litColor);
      circle(o.x, o.y, 8);
    }
  }
}
