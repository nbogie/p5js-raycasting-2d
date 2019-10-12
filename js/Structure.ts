class Structure {
  randomColor(): p5.Color {
    return random([
      color(250, 105, 0),
      color(105, 210, 231),
      color(167, 219, 216),
      color(243, 134, 48)
    ]);
  }
  isFilledShape = false;
  center: p5.Vector;
  abstractVertices: p5.Vector[];
  walls: Wall[];
  movementSpeed: number;
  myColor: p5.Color;
  rotation: number;
  rotationSpeed: number;

  constructor(center: p5.Vector, radius: number, numSides: number) {
    this.rotation = random(TWO_PI);
    this.myColor = this.randomColor();
    this.movementSpeed = -random(0.2, 2);
    this.rotationSpeed = random(-0.01, 0.01);
    this.abstractVertices = this.createVerticesForShapeWithNumSides(
      center,
      radius,
      numSides
    );

    this.walls = this.makeWallsFromVertices(
      this.abstractVertices,
      this.myColor
    );
  }

  createVerticesForShapeWithNumSides(
    center: p5.Vector,
    radius: number,
    numSides: number
  ): p5.Vector[] {
    const vertices = [];
    //special case for single wall
    if (numSides === 1) {
      let [a, b] = this.createRandomLineSeg();
      vertices.push(a);
      vertices.push(b);
      this.center = a.copy().lerp(b, 0.5);
    } else {
      this.center = center.copy();

      for (let i = 0; i < numSides; i++) {
        const angle = (i * TWO_PI) / numSides;
        vertices.push(
          p5.Vector.fromAngle(angle)
            .mult(radius)
            .add(this.center)
        );
      }
    }
    return vertices;
  }
  makeWallsFromVertices(vs: p5.Vector[], myColor: p5.Color): Wall[] {
    const walls: Wall[] = [];
    if (vs.length === 2) {
      const singleWall = new Wall(vs[0], vs[1]);
      singleWall.myColor = myColor;
      walls.push(singleWall);
    } else {
      const numSides = vs.length;
      for (let i = 0; i < numSides; i++) {
        const a = vs[i];
        const b = i === numSides - 1 ? vs[0] : vs[i + 1];
        const wall = new Wall(a, b);
        wall.myColor = myColor;
        walls.push(wall);
      }
    }
    return walls;
  }
  createRandomLineSeg(): p5.Vector[] {
    const p1 = randomScreenPosition();
    const p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
    return [p1, p2];
  }

  rotate(angleRad: number): void {
    this.rotation += angleRad;
    const rotatedVertices = this.abstractVertices.map(v =>
      rotateVertexAround(v, this.center, this.rotation)
    );

    //remake the walls
    this.walls = this.makeWallsFromVertices(rotatedVertices, this.myColor);
  }

  update() {
    let moveAmt: number = this.movementSpeed;
    if (this.center.x + moveAmt < 0) {
      moveAmt += width;
    }
    this.center.x += moveAmt;
    //remake the walls
    this.walls = this.makeWallsFromVertices(
      this.abstractVertices.map(v => v.add(createVector(moveAmt, 0))),
      this.myColor
    );

    this.rotate(this.rotationSpeed);
  }
  draw() {
    for (let wall of this.walls) {
      wall.draw();
    }
    circle(this.center.x, this.center.y, 5);
    if (this.isFilledShape) {
      beginShape();
      for (let wall of this.walls) {
        for (let pt of [wall.a, wall.b]) {
          vertex(pt.x, pt.y);
        }
      }
      endShape(CLOSE);
    }
  }

  static createRandom() {
    const center = randomScreenPosition();
    const numSides = random([1, 1, 1, 3, 4, 5, 8]);
    return new Structure(center, random(20, random(100, 200)), numSides);
  }
}
