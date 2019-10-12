class Agent {
  pos: p5.Vector;
  movementPhase: number;
  ray: Ray;

  constructor(pos: p5.Vector) {
    this.pos = pos.copy();
    this.movementPhase = random(10000);
    this.ray = new Ray(this.pos, { target: mousePosAsVector() });
  }

  draw() {
    const targetPos = mousePosAsVector();
    const o = this.pos;
    //draw agent sprite (a circle) according to whether it has l.o.s. to targetPos
    noStroke();
    push();
    translate(o.x, o.y);
    scale(2);
    let brightness;
    if (!this.ray.canSeePoint(targetPos)) {
      brightness = 20;
    } else {
      const distToTarget = this.pos.dist(targetPos);
      brightness = map(distToTarget, 0, max(width, height), 255, 0);
    }
    const litColor: p5.Color = color(224, 228, 204, brightness);
    fill(litColor);
    circle(0, 0, 8);
    fill(0, 0, 0, 40);
    rectMode(CENTER);
    rect(0, 3, 5, 2);
    //eyes
    circle(-2, -1, 1);
    circle(2, -1, 1);

    pop();
  }

  setPosition(pos: p5.Vector) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
  }

  static createRandom() {
    return new Agent(randomScreenPosition());
  }
  /** move the agent and recalculate the ray from it to the target pos */
  update(walls: Wall[], targetPos: p5.Vector): void {
    const offset = createVector(0, 0);
    offset.x = map(
      noise(this.movementPhase + 33333 + frameCount / 100),
      0,
      1,
      -1,
      1
    );
    offset.y = map(noise(this.movementPhase + frameCount / 100), 0, 1, -1, 1);

    this.setPosition(this.pos.copy().add(offset));

    this.ray = new Ray(this.pos, { target: targetPos, walls: walls });
  }
}
