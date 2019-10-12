class Agent {
  pos: p5.Vector;
  movementPhase: number;
  speed: number;
  ray: Ray;

  constructor(pos: p5.Vector) {
    this.pos = pos.copy();
    this.movementPhase = random(10000);
    this.speed = 1;
    this.ray = new Ray(this.pos, { target: mousePosAsVector() });
  }

  draw() {
    noStroke();
    fill("black");
    rectMode(CENTER);
    square(this.pos.x, this.pos.y, 3);
    fill(0, 20);

    this.drawAgentCanSeePosition(mousePosAsVector());
  }

  drawAgentCanSeePosition(targetPos: p5.Vector) {
    const o = this.pos;

    //draw agent sprite (a circle) according to whether it has l.o.s. to targetPos
    noStroke();
    if (this.ray.canSeePoint(targetPos)) {
      fill(0, 0, 0, 20);
      circle(o.x, o.y, 8);
    } else {
      const distToTarget = this.pos.dist(targetPos);
      const brightness = map(distToTarget, 0, max(width, height), 255, 0);
      const litColor: p5.Color = color(255, 255, 255, brightness);
      fill(litColor);
      circle(o.x, o.y, 8);
    }
  }

  setPosition(pos: p5.Vector) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
  }

  static createRandom() {
    return new Agent(randomScreenPosition());
  }

  updateWithRoaming(walls: Wall[], targetPos: p5.Vector): void {
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

    const attractVec = this.pos
      .copy()
      .sub(targetPos)
      .normalize();
    newPos = this.pos.copy().add(attractVec.mult(this.speed));

    newPos.add(offset);

    this.setPosition(newPos);
    this.ray = new Ray(this.pos, { target: targetPos });
    this.ray.recalculateIntersections(walls);

    const newSpeed =
      this.speed + (this.ray.canSeePoint(targetPos) ? -0.1 : 0.1);
    if (Math.abs(newSpeed) < 3) {
      this.speed = newSpeed;
    }
  }
}
