"use strict";
var Agent = (function () {
    function Agent(pos) {
        this.pos = pos.copy();
        this.movementPhase = random(10000);
        this.ray = new Ray(this.pos, { target: mousePosAsVector() });
    }
    Agent.prototype.draw = function () {
        var targetPos = mousePosAsVector();
        var o = this.pos;
        noStroke();
        push();
        translate(o.x, o.y);
        scale(2);
        var brightness;
        if (!this.ray.canSeePoint(targetPos)) {
            brightness = 20;
        }
        else {
            var distToTarget = this.pos.dist(targetPos);
            brightness = map(distToTarget, 0, max(width, height), 255, 0);
        }
        var litColor = color(224, 228, 204, brightness);
        fill(litColor);
        circle(0, 0, 8);
        fill(0, 0, 0, 40);
        rectMode(CENTER);
        rect(0, 3, 5, 2);
        circle(-2, -1, 1);
        circle(2, -1, 1);
        pop();
    };
    Agent.prototype.setPosition = function (pos) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    };
    Agent.createRandom = function () {
        return new Agent(randomScreenPosition());
    };
    Agent.prototype.update = function (walls, targetPos) {
        var offset = createVector(0, 0);
        offset.x = map(noise(this.movementPhase + 33333 + frameCount / 100), 0, 1, -1, 1);
        offset.y = map(noise(this.movementPhase + frameCount / 100), 0, 1, -1, 1);
        this.setPosition(this.pos.copy().add(offset));
        this.ray = new Ray(this.pos, { target: targetPos, walls: walls });
    };
    return Agent;
}());
function makeDistancesBuffer(rays) {
    return generateDataFromRays(rays);
}
function generateDataFromRays(rays) {
    return {
        values: rays.map(function (ray) {
            var pt = ray.nearestIntersection();
            return pt ? pt.mag() : width;
        })
    };
}
function generateFakeData(numStrips) {
    var buff = [];
    repeat(numStrips, function (ix) {
        buff.push(noise(ix / 20, frameCount / 200) * width);
    });
    return { values: buff };
}
function drawDistancesBuffer(dists) {
    var numStrips = dists.values.length;
    var stripWidth = width / numStrips;
    dists.values.forEach(function (dist, ix) {
        var x = ix * stripWidth;
        var y = map(dist, 0, width, height, 0);
        noStroke();
        rectMode(CENTER);
        rect(x, height / 2, stripWidth, y);
    });
}
var Palette = (function () {
    function Palette() {
    }
    Palette.getColors = function () {
        return [
            color(250, 105, 0),
            color(105, 210, 231),
            color(167, 219, 216),
            color(243, 134, 48)
        ];
    };
    Palette.randomColor = function () {
        return random(Palette.getColors());
    };
    return Palette;
}());
var Particle = (function () {
    function Particle(pos) {
        this.pos = pos.copy();
        this.heading = 0;
    }
    Particle.prototype.draw = function () {
        noStroke();
        fill("black");
        rectMode(CENTER);
        square(this.pos.x, this.pos.y, 3);
        fill(0, 20);
    };
    Particle.prototype.update = function () {
        var mouseMovementAngle = angleOfLastMouseMovement();
        if (mouseMovementAngle !== undefined) {
            this.heading = mouseMovementAngle;
        }
    };
    Particle.prototype.setPosition = function (pos) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    };
    Particle.createRandom = function () {
        return new Particle(randomScreenPosition());
    };
    return Particle;
}());
var Ray = (function () {
    function Ray(origin, _a) {
        var _b = _a.angleRads, angleRads = _b === void 0 ? null : _b, _c = _a.target, target = _c === void 0 ? null : _c, _d = _a.walls, walls = _d === void 0 ? [] : _d;
        this.origin = origin.copy();
        if (target !== null) {
            this.lookAt(target);
        }
        else {
            this.angleRads = p5.Vector.fromAngle(angleRads);
        }
        this.intersectionPoints = [];
        this.recalculateFarEnd();
        if (walls.length > 0) {
            this.recalculateIntersections(walls);
        }
    }
    Ray.prototype.lookAt = function (targetPos) {
        var deltaToTarget = targetPos.copy().sub(this.origin);
        var angleToTarget = atan2(deltaToTarget.y, deltaToTarget.x);
        this.angleRads = p5.Vector.fromAngle(angleToTarget);
        this.recalculateFarEnd();
    };
    Ray.createRandom = function () {
        return new Ray(randomScreenPosition(), { angleRads: random(0, TWO_PI) });
    };
    Ray.prototype.intersectionWithWall = function (wall) {
        var answer = collideLineLine(wall.a.x, wall.a.y, wall.b.x, wall.b.y, this.origin.x, this.origin.y, this.farEnd.x, this.farEnd.y);
        return answer;
    };
    Ray.prototype.nearestIntersection = function () {
        var _this = this;
        if (this.intersectionPoints.length > 0) {
            return minBy(this.intersectionPoints, function (pt) { return -_this.origin.dist(pt); });
        }
        else {
            return undefined;
        }
    };
    Ray.prototype.calculateIntersections = function (walls) {
        var res = [];
        for (var _i = 0, walls_1 = walls; _i < walls_1.length; _i++) {
            var wall = walls_1[_i];
            var intersection = this.intersectionWithWall(wall);
            if (intersection) {
                res.push(intersection);
            }
        }
        return res;
    };
    Ray.prototype.recalculateIntersections = function (walls) {
        this.intersectionPoints = this.calculateIntersections(walls);
    };
    Ray.prototype.recalculateFarEnd = function () {
        this.farEnd = this.origin.copy().add(this.angleRads.copy().mult(width));
    };
    Ray.prototype.drawLitLineSegment = function (a, b) {
        if (Ray.isRenderAsCobweb) {
            for (var i = 0; i < 20; i++) {
                var pt = a.copy().lerp(b, i / 10);
                square(pt.x, pt.y, 1);
            }
        }
        else {
            line(a.x, a.y, b.x, b.y);
        }
    };
    Ray.prototype.drawRayUntilFirstIntersection = function () {
        var o = this.origin;
        var end = o.copy().add(this.angleRads.copy().mult(40));
        if (Ray.isDrawGhostRay) {
            stroke(255, 255, 255, 10);
            strokeWeight(0.3);
            line(o.x, o.y, this.farEnd.x, this.farEnd.y);
        }
        var nearPt = this.nearestIntersection();
        if (Ray.isDrawRayToFirstIntersection) {
            if (nearPt) {
                stroke("white");
                strokeWeight(2);
                this.drawLitLineSegment(o, nearPt);
            }
        }
        if (Ray.isDrawIntersections) {
            for (var _i = 0, _a = this.intersectionPoints; _i < _a.length; _i++) {
                var iPt = _a[_i];
                fill("gray");
                circle(iPt.x, iPt.y, 2);
            }
            var first = this.nearestIntersection();
            if (first) {
                fill("white");
                circle(first.x, first.y, 2);
            }
        }
    };
    Ray.prototype.canSeePoint = function (target) {
        var nearestIsect = this.nearestIntersection();
        var distToTarget = this.origin.dist(target);
        return !(nearestIsect && this.origin.dist(nearestIsect) < distToTarget);
    };
    Ray.isRenderAsCobweb = false;
    Ray.isDrawGhostRay = true;
    Ray.isDrawRayToFirstIntersection = true;
    Ray.isDrawIntersections = false;
    return Ray;
}());
var Structure = (function () {
    function Structure(center, radius, numSides) {
        this.isFilledShape = false;
        this.rotation = random(TWO_PI);
        this.myColor = Palette.randomColor();
        this.movementSpeed = -random(0.2, 2);
        this.rotationSpeed = random(-0.01, 0.01);
        this.abstractVertices = this.createVerticesForShapeWithNumSides(center, radius, numSides);
        this.walls = this.makeWallsFromVertices(this.abstractVertices, this.myColor);
    }
    Structure.prototype.createVerticesForShapeWithNumSides = function (center, radius, numSides) {
        var vertices = [];
        if (numSides === 1) {
            var _a = this.createRandomLineSeg(), a = _a[0], b = _a[1];
            vertices.push(a);
            vertices.push(b);
            this.center = a.copy().lerp(b, 0.5);
        }
        else {
            this.center = center.copy();
            for (var i = 0; i < numSides; i++) {
                var angle = (i * TWO_PI) / numSides;
                vertices.push(p5.Vector.fromAngle(angle)
                    .mult(radius)
                    .add(this.center));
            }
        }
        return vertices;
    };
    Structure.prototype.makeWallsFromVertices = function (vs, myColor) {
        var walls = [];
        if (vs.length === 2) {
            var singleWall = new Wall(vs[0], vs[1]);
            singleWall.myColor = myColor;
            walls.push(singleWall);
        }
        else {
            var numSides = vs.length;
            for (var i = 0; i < numSides; i++) {
                var a = vs[i];
                var b = i === numSides - 1 ? vs[0] : vs[i + 1];
                var wall = new Wall(a, b);
                wall.myColor = myColor;
                walls.push(wall);
            }
        }
        return walls;
    };
    Structure.prototype.createRandomLineSeg = function () {
        var p1 = randomScreenPosition();
        var p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
        return [p1, p2];
    };
    Structure.prototype.rotate = function (angleRad) {
        var _this = this;
        this.rotation += angleRad;
        var rotatedVertices = this.abstractVertices.map(function (v) {
            return rotateVertexAround(v, _this.center, _this.rotation);
        });
        this.walls = this.makeWallsFromVertices(rotatedVertices, this.myColor);
    };
    Structure.prototype.update = function () {
        var moveAmt = this.movementSpeed;
        if (this.center.x + moveAmt < 0) {
            moveAmt += width;
        }
        this.center.x += moveAmt;
        this.walls = this.makeWallsFromVertices(this.abstractVertices.map(function (v) { return v.add(createVector(moveAmt, 0)); }), this.myColor);
        this.rotate(this.rotationSpeed);
    };
    Structure.prototype.draw = function () {
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            wall.draw();
        }
        if (this.isFilledShape) {
            beginShape();
            for (var _b = 0, _c = this.walls; _b < _c.length; _b++) {
                var wall = _c[_b];
                for (var _d = 0, _e = [wall.a, wall.b]; _d < _e.length; _d++) {
                    var pt = _e[_d];
                    vertex(pt.x, pt.y);
                }
            }
            endShape(CLOSE);
        }
    };
    Structure.createRandom = function () {
        var center = randomScreenPosition();
        var numSides = random([1, 1, 1, 3, 4, 5, 6]);
        return new Structure(center, random(20, random(100, 200)), numSides);
    };
    return Structure;
}());
function repeat(num, fn) {
    for (var i = 0; i < num; i++) {
        fn(i);
    }
}
function randomScreenPosition() {
    return createVector(random(width), random(height));
}
function randomInt(min, max) {
    return round(random(min, max));
}
function translateToVec(pos) {
    translate(pos.x, pos.y);
}
function centerPos() {
    return createVector(width / 2, height / 2);
}
function rotateVertexAround(vertex, rotOrigin, angleRad) {
    return vertex
        .copy()
        .sub(rotOrigin)
        .rotate(angleRad)
        .add(rotOrigin);
}
function collideLineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    var uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) /
        ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    var uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) /
        ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        var intersectionX = x1 + uA * (x2 - x1);
        var intersectionY = y1 + uA * (y2 - y1);
        return createVector(intersectionX, intersectionY);
    }
    return null;
}
function minBy(list, fn) {
    if (list.length < 0) {
        return null;
    }
    var recordItem = list[0];
    var recordWeight = fn(list[0]);
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var item = list_1[_i];
        var weight = fn(item);
        if (weight > recordWeight) {
            recordWeight = weight;
            recordItem = item;
        }
    }
    return recordItem;
}
function distributeUpTo(total, max, fn) {
    repeat(total, function (ix) {
        var val = (ix * max) / total;
        fn(val);
    });
}
function distributeBetween(numSamples, min, max, fn) {
    repeat(numSamples, function (ix) {
        var range = max - min;
        var val = min + (ix * range) / numSamples;
        fn(val);
    });
}
function averageVectors(vs) {
    if (vs.length < 1) {
        return createVector(0, 0);
    }
    return vs.reduce(function (v1, v2) { return v1.copy().add(v2); }, vs[0]).div(vs.length);
}
var gLastMouseMovements = [];
function angleOfLastMouseMovement() {
    var delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
    if (delta.magSq() < 1) {
        return undefined;
    }
    else {
        gLastMouseMovements.unshift(delta);
        gLastMouseMovements.splice(8);
        var avgMovement = averageVectors(gLastMouseMovements);
        if (avgMovement.mag() > 0) {
            return avgMovement.heading();
        }
        else {
            return undefined;
        }
    }
}
var Wall = (function () {
    function Wall(a, b) {
        this.a = a.copy();
        this.b = b.copy();
        this.myColor = color(243, 134, 48);
    }
    Wall.prototype.draw = function () {
        stroke(this.myColor);
        strokeWeight(4);
        line(this.a.x, this.a.y, this.b.x, this.b.y);
        noStroke();
        fill(this.myColor);
        [this.a, this.b].forEach(function (pt) {
        });
    };
    Wall.prototype.midPoint = function () {
        return this.a.copy().lerp(this.b, 0.5);
    };
    Wall.prototype.length = function () {
        return dist(this.a.x, this.a.y, this.b.x, this.b.y);
    };
    Wall.createRandom = function () {
        var p1 = randomScreenPosition();
        var p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
        return new Wall(p1, p2);
    };
    return Wall;
}());
p5.disableFriendlyErrors = true;
var isMovingStructures = true;
var isDrawingIn3D = false;
var gAgents = [];
var gPlayerRays = [];
var gPlayer = null;
var gNumWalls = 20;
var gNumAgents = 100;
var gNumPlayerRays = 100;
var gNumStructures = 10;
var gStructures = [];
function setup() {
    createCanvas(windowWidth, windowHeight);
    repeat(gNumStructures, function () {
        var structure = Structure.createRandom();
        gStructures.push(structure);
    });
    repeat(gNumAgents, function () {
        gAgents.push(Agent.createRandom());
    });
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector());
    gPlayer = Particle.createRandom();
    mouseX = centerPos().x;
    mouseY = centerPos().y;
}
function makeScreenWalls() {
    var _a = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
    ].map(function (_a) {
        var x = _a[0], y = _a[1];
        return createVector(x, y);
    }), tl = _a[0], tr = _a[1], br = _a[2], bl = _a[3];
    return [[tl, tr], [tr, br], [bl, br], [tl, bl]].map(function (_a) {
        var pt1 = _a[0], pt2 = _a[1];
        return new Wall(pt1, pt2);
    });
}
function getAllWalls() {
    var wallsFromStructures = gStructures.flatMap(function (structure) { return structure.walls; });
    var screenWalls = makeScreenWalls();
    return screenWalls.concat(wallsFromStructures);
}
function createRaysAtPosition(numRays, pos, heading) {
    var rays = [];
    var halfFOV = radians(30);
    distributeBetween(numRays, heading - halfFOV, heading + halfFOV, function (val) {
        return rays.push(new Ray(pos, { angleRads: val, walls: getAllWalls() }));
    });
    return rays;
}
function mousePosAsVector() {
    return createVector(mouseX, mouseY);
}
function update() {
    gPlayer.setPosition(mousePosAsVector());
    gPlayer.update();
    for (var _i = 0, gStructures_1 = gStructures; _i < gStructures_1.length; _i++) {
        var s = gStructures_1[_i];
        if (isMovingStructures) {
            s.update();
        }
    }
    for (var _a = 0, gAgents_1 = gAgents; _a < gAgents_1.length; _a++) {
        var agent = gAgents_1[_a];
        agent.update(getAllWalls(), mousePosAsVector());
    }
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), gPlayer.heading);
    debugger;
}
function draw() {
    update();
    background(0);
    isDrawingIn3D ? drawFake3D() : drawTopDown();
    drawPlayerDebugInfo();
}
function drawPlayerDebugInfo() {
    push();
    translate(gPlayer.pos.x, gPlayer.pos.y);
    noFill();
    stroke("purple");
    var vec = p5.Vector.fromAngle(gPlayer.heading).mult(50);
    line(0, 0, vec.x, vec.y);
    circle(0, 0, 10);
    pop();
}
function drawFake3D() {
    background("gray");
    var buff = makeDistancesBuffer(gPlayerRays);
    debugger;
    drawDistancesBuffer(buff);
}
function drawTopDown() {
    fill("black");
    noStroke();
    for (var _i = 0, gStructures_2 = gStructures; _i < gStructures_2.length; _i++) {
        var s = gStructures_2[_i];
        s.draw();
    }
    for (var _a = 0, _b = getAllWalls(); _a < _b.length; _a++) {
        var wall = _b[_a];
        wall.draw();
    }
    for (var _c = 0, gAgents_2 = gAgents; _c < gAgents_2.length; _c++) {
        var agent = gAgents_2[_c];
        agent.draw();
    }
    for (var _d = 0, gPlayerRays_1 = gPlayerRays; _d < gPlayerRays_1.length; _d++) {
        var ray = gPlayerRays_1[_d];
        ray.drawRayUntilFirstIntersection();
    }
    gPlayer.draw();
}
function toggle2D3D() {
    isDrawingIn3D = !isDrawingIn3D;
}
function toggleMovingStructures() {
    isMovingStructures = !isMovingStructures;
}
function mousePressed() {
    toggleMovingStructures();
}
function keyPressed() {
    if (key == "3") {
        toggle2D3D();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiLi9qcy8iLCJzb3VyY2VzIjpbImluZGV4LnRzIiwiQWdlbnQudHMiLCJGYWtlM0QudHMiLCJQYWxldHRlLnRzIiwiUGFydGljbGUudHMiLCJSYXkudHMiLCJTdHJ1Y3R1cmUudHMiLCJVdGlscy50cyIsIldhbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FDQWI7SUFLRSxlQUFZLEdBQWM7UUFDeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxvQkFBSSxHQUFKO1FBQ0UsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyQyxJQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRW5CLFFBQVEsRUFBRSxDQUFDO1FBQ1gsSUFBSSxFQUFFLENBQUM7UUFDUCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1QsSUFBSSxVQUFVLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEMsVUFBVSxHQUFHLEVBQUUsQ0FBQztTQUNqQjthQUFNO1lBQ0wsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEdB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QUFFO1FBQ2QsVUFBVSxFQUFFLENBQUM7S0FDZDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxucDUuZGlzYWJsZUZyaWVuZGx5RXJyb3JzID0gdHJ1ZTtcbmxldCBpc01vdmluZ1N0cnVjdHVyZXMgPSB0cnVlO1xubGV0IGlzRHJhd2luZ0luM0Q6IGJvb2xlYW4gPSBmYWxzZTtcbmxldCBnQWdlbnRzOiBBZ2VudFtdID0gW107XG5sZXQgZ1BsYXllclJheXM6IFJheVtdID0gW107XG5sZXQgZ1BsYXllcjogUGFydGljbGUgPSBudWxsO1xubGV0IGdOdW1XYWxsczogbnVtYmVyID0gMjA7XG5sZXQgZ051bUFnZW50czogbnVtYmVyID0gMTAwO1xubGV0IGdOdW1QbGF5ZXJSYXlzOiBudW1iZXIgPSAxMDA7XG5sZXQgZ051bVN0cnVjdHVyZXMgPSAxMDtcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogU0VUVVBcbiAqL1xuY29uc3QgZ1N0cnVjdHVyZXM6IFN0cnVjdHVyZVtdID0gW107XG5mdW5jdGlvbiBzZXR1cCgpIHtcbiAgY3JlYXRlQ2FudmFzKHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuXG4gIHJlcGVhdChnTnVtU3RydWN0dXJlcywgKCkgPT4ge1xuICAgIGNvbnN0IHN0cnVjdHVyZSA9IFN0cnVjdHVyZS5jcmVhdGVSYW5kb20oKTtcbiAgICBnU3RydWN0dXJlcy5wdXNoKHN0cnVjdHVyZSk7XG4gIH0pO1xuXG4gIHJlcGVhdChnTnVtQWdlbnRzLCAoKSA9PiB7XG4gICAgZ0FnZW50cy5wdXNoKEFnZW50LmNyZWF0ZVJhbmRvbSgpKTtcbiAgfSk7XG5cbiAgZ1BsYXllclJheXMgPSBjcmVhdGVSYXlzQXRQb3NpdGlvbihnTnVtUGxheWVyUmF5cywgbW91c2VQb3NBc1ZlY3RvcigpKTtcbiAgZ1BsYXllciA9IFBhcnRpY2xlLmNyZWF0ZVJhbmRvbSgpO1xuICBtb3VzZVggPSBjZW50ZXJQb3MoKS54O1xuICBtb3VzZVkgPSBjZW50ZXJQb3MoKS55O1xufVxuXG5mdW5jdGlvbiBtYWtlU2NyZWVuV2FsbHMoKTogV2FsbFtdIHtcbiAgY29uc3QgW3RsLCB0ciwgYnIsIGJsXSA9IFtcbiAgICBbMCwgMF0sXG4gICAgW3dpZHRoLCAwXSxcbiAgICBbd2lkdGgsIGhlaWdodF0sXG4gICAgWzAsIGhlaWdodF1cbiAgXS5tYXAoKFt4LCB5XSkgPT4gY3JlYXRlVmVjdG9yKHgsIHkpKTtcbiAgcmV0dXJuIFtbdGwsIHRyXSwgW3RyLCBicl0sIFtibCwgYnJdLCBbdGwsIGJsXV0ubWFwKFxuICAgIChbcHQxLCBwdDJdKSA9PiBuZXcgV2FsbChwdDEsIHB0MilcbiAgKTtcbn1cbmZ1bmN0aW9uIGdldEFsbFdhbGxzKCk6IFdhbGxbXSB7XG4gIGNvbnN0IHdhbGxzRnJvbVN0cnVjdHVyZXMgPSBnU3RydWN0dXJlcy5mbGF0TWFwKFxuICAgIChzdHJ1Y3R1cmU6IFN0cnVjdHVyZSkgPT4gc3RydWN0dXJlLndhbGxzXG4gICk7XG4gIGNvbnN0IHNjcmVlbldhbGxzID0gbWFrZVNjcmVlbldhbGxzKCk7XG4gIHJldHVybiBzY3JlZW5XYWxscy5jb25jYXQod2FsbHNGcm9tU3RydWN0dXJlcyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJheXNBdFBvc2l0aW9uKFxuICBudW1SYXlzOiBudW1iZXIsXG4gIHBvczogcDUuVmVjdG9yLFxuICBoZWFkaW5nOiBudW1iZXJcbikge1xuICBjb25zdCByYXlzOiBSYXlbXSA9IFtdO1xuICBjb25zdCBoYWxmRk9WID0gcmFkaWFucygzMCk7XG4gIGRpc3RyaWJ1dGVCZXR3ZWVuKG51bVJheXMsIGhlYWRpbmcgLSBoYWxmRk9WLCBoZWFkaW5nICsgaGFsZkZPViwgdmFsID0+XG4gICAgcmF5cy5wdXNoKG5ldyBSYXkocG9zLCB7IGFuZ2xlUmFkczogdmFsLCB3YWxsczogZ2V0QWxsV2FsbHMoKSB9KSlcbiAgKTtcblxuICAvLyBkaXN0cmlidXRlVXBUbyhudW1SYXlzLCBUV09fUEkgLyA4LCB2YWwgPT5cbiAgLy8gICByYXlzLnB1c2gobmV3IFJheShwb3MsIHsgYW5nbGVSYWRzOiB2YWwsIHdhbGxzOiBnZXRBbGxXYWxscygpIH0pKVxuICAvLyApO1xuICByZXR1cm4gcmF5cztcbn1cblxuZnVuY3Rpb24gbW91c2VQb3NBc1ZlY3RvcigpIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3Rvcihtb3VzZVgsIG1vdXNlWSk7XG59XG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gIGdQbGF5ZXIuc2V0UG9zaXRpb24obW91c2VQb3NBc1ZlY3RvcigpKTtcbiAgZ1BsYXllci51cGRhdGUoKTtcblxuICBmb3IgKGxldCBzIG9mIGdTdHJ1Y3R1cmVzKSB7XG4gICAgaWYgKGlzTW92aW5nU3RydWN0dXJlcykge1xuICAgICAgcy51cGRhdGUoKTtcbiAgICB9XG4gIH1cbiAgZm9yIChsZXQgYWdlbnQgb2YgZ0FnZW50cykge1xuICAgIGFnZW50LnVwZGF0ZShnZXRBbGxXYWxscygpLCBtb3VzZVBvc0FzVmVjdG9yKCkpO1xuICB9XG5cbiAgZ1BsYXllclJheXMgPSBjcmVhdGVSYXlzQXRQb3NpdGlvbihcbiAgICBnTnVtUGxheWVyUmF5cyxcbiAgICBtb3VzZVBvc0FzVmVjdG9yKCksXG4gICAgZ1BsYXllci5oZWFkaW5nXG4gICk7XG4gIGRlYnVnZ2VyO1xufVxuXG4vKlxuICogRFJBV1xuICovXG5mdW5jdGlvbiBkcmF3KCkge1xuICB1cGRhdGUoKTtcbiAgYmFja2dyb3VuZCgwKTtcbiAgaXNEcmF3aW5nSW4zRCA/IGRyYXdGYWtlM0QoKSA6IGRyYXdUb3BEb3duKCk7XG4gIGRyYXdQbGF5ZXJEZWJ1Z0luZm8oKTtcbn1cblxuZnVuY3Rpb24gZHJhd1BsYXllckRlYnVnSW5mbygpIHtcbiAgcHVzaCgpO1xuICB0cmFuc2xhdGUoZ1BsYXllci5wb3MueCwgZ1BsYXllci5wb3MueSk7XG4gIG5vRmlsbCgpO1xuICBzdHJva2UoXCJwdXJwbGVcIik7XG4gIGNvbnN0IHZlYyA9IHA1LlZlY3Rvci5mcm9tQW5nbGUoZ1BsYXllci5oZWFkaW5nKS5tdWx0KDUwKTtcbiAgbGluZSgwLCAwLCB2ZWMueCwgdmVjLnkpO1xuICBjaXJjbGUoMCwgMCwgMTApO1xuICBwb3AoKTtcbn1cbmZ1bmN0aW9uIGRyYXdGYWtlM0QoKSB7XG4gIGJhY2tncm91bmQoXCJncmF5XCIpO1xuICBjb25zdCBidWZmID0gbWFrZURpc3RhbmNlc0J1ZmZlcihnUGxheWVyUmF5cyk7XG4gIGRlYnVnZ2VyO1xuICBkcmF3RGlzdGFuY2VzQnVmZmVyKGJ1ZmYpO1xufVxuZnVuY3Rpb24gZHJhd1RvcERvd24oKSB7XG4gIGZpbGwoXCJibGFja1wiKTtcbiAgbm9TdHJva2UoKTtcbiAgZm9yIChsZXQgcyBvZiBnU3RydWN0dXJlcykge1xuICAgIHMuZHJhdygpO1xuICB9XG4gIGZvciAobGV0IHdhbGwgb2YgZ2V0QWxsV2FsbHMoKSkge1xuICAgIHdhbGwuZHJhdygpO1xuICB9XG4gIGZvciAobGV0IGFnZW50IG9mIGdBZ2VudHMpIHtcbiAgICBhZ2VudC5kcmF3KCk7XG4gIH1cbiAgZm9yIChsZXQgcmF5IG9mIGdQbGF5ZXJSYXlzKSB7XG4gICAgcmF5LmRyYXdSYXlVbnRpbEZpcnN0SW50ZXJzZWN0aW9uKCk7XG4gIH1cbiAgZ1BsYXllci5kcmF3KCk7XG59XG5mdW5jdGlvbiB0b2dnbGUyRDNEKCkge1xuICBpc0RyYXdpbmdJbjNEID0gIWlzRHJhd2luZ0luM0Q7XG59XG5mdW5jdGlvbiB0b2dnbGVNb3ZpbmdTdHJ1Y3R1cmVzKCkge1xuICBpc01vdmluZ1N0cnVjdHVyZXMgPSAhaXNNb3ZpbmdTdHJ1Y3R1cmVzO1xufVxuZnVuY3Rpb24gbW91c2VQcmVzc2VkKCkge1xuICB0b2dnbGVNb3ZpbmdTdHJ1Y3R1cmVzKCk7XG59XG5mdW5jdGlvbiBrZXlQcmVzc2VkKCkge1xuICBpZiAoa2V5ID09IFwiM1wiKSB7XG4gICAgdG9nZ2xlMkQzRCgpO1xuICB9XG59XG4iLCJjbGFzcyBBZ2VudCB7XG4gIHBvczogcDUuVmVjdG9yO1xuICBtb3ZlbWVudFBoYXNlOiBudW1iZXI7XG4gIHJheTogUmF5O1xuXG4gIGNvbnN0cnVjdG9yKHBvczogcDUuVmVjdG9yKSB7XG4gICAgdGhpcy5wb3MgPSBwb3MuY29weSgpO1xuICAgIHRoaXMubW92ZW1lbnRQaGFzZSA9IHJhbmRvbSgxMDAwMCk7XG4gICAgdGhpcy5yYXkgPSBuZXcgUmF5KHRoaXMucG9zLCB7IHRhcmdldDogbW91c2VQb3NBc1ZlY3RvcigpIH0pO1xuICB9XG5cbiAgZHJhdygpIHtcbiAgICBjb25zdCB0YXJnZXRQb3MgPSBtb3VzZVBvc0FzVmVjdG9yKCk7XG4gICAgY29uc3QgbyA9IHRoaXMucG9zO1xuICAgIC8vZHJhdyBhZ2VudCBzcHJpdGUgKGEgY2lyY2xlKSBhY2NvcmRpbmcgdG8gd2hldGhlciBpdCBoYXMgbC5vLnMuIHRvIHRhcmdldFBvc1xuICAgIG5vU3Ryb2tlKCk7XG4gICAgcHVzaCgpO1xuICAgIHRyYW5zbGF0ZShvLngsIG8ueSk7XG4gICAgc2NhbGUoMik7XG4gICAgbGV0IGJyaWdodG5lc3M7XG4gICAgaWYgKCF0aGlzLnJheS5jYW5TZWVQb2ludCh0YXJnZXRQb3MpKSB7XG4gICAgICBicmlnaHRuZXNzID0gMjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IHRoaXMucG9zLmRpc3QodGFyZ2V0UG9zKTtcbiAgICAgIGJyaWdodG5lc3MgPSBtYXAoZGlzdFRvVGFyZ2V0LCAwLCBtYXgod2lkdGgsIGhlaWdodCksIDI1NSwgMCk7XG4gICAgfVxuICAgIGNvbnN0IGxpdENvbG9yOiBwNS5Db2xvciA9IGNvbG9yKDIyNCwgMjI4LCAyMDQsIGJyaWdodG5lc3MpO1xuICAgIGZpbGwobGl0Q29sb3IpO1xuICAgIGNpcmNsZSgwLCAwLCA4KTtcbiAgICBmaWxsKDAsIDAsIDAsIDQwKTtcbiAgICByZWN0TW9kZShDRU5URVIpO1xuICAgIHJlY3QoMCwgMywgNSwgMik7XG4gICAgLy9leWVzXG4gICAgY2lyY2xlKC0yLCAtMSwgMSk7XG4gICAgY2lyY2xlKDIsIC0xLCAxKTtcblxuICAgIHBvcCgpO1xuICB9XG5cbiAgc2V0UG9zaXRpb24ocG9zOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLnBvcy54ID0gcG9zLng7XG4gICAgdGhpcy5wb3MueSA9IHBvcy55O1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpIHtcbiAgICByZXR1cm4gbmV3IEFnZW50KHJhbmRvbVNjcmVlblBvc2l0aW9uKCkpO1xuICB9XG4gIC8qKiBtb3ZlIHRoZSBhZ2VudCBhbmQgcmVjYWxjdWxhdGUgdGhlIHJheSBmcm9tIGl0IHRvIHRoZSB0YXJnZXQgcG9zICovXG4gIHVwZGF0ZSh3YWxsczogV2FsbFtdLCB0YXJnZXRQb3M6IHA1LlZlY3Rvcik6IHZvaWQge1xuICAgIGNvbnN0IG9mZnNldCA9IGNyZWF0ZVZlY3RvcigwLCAwKTtcbiAgICBvZmZzZXQueCA9IG1hcChcbiAgICAgIG5vaXNlKHRoaXMubW92ZW1lbnRQaGFzZSArIDMzMzMzICsgZnJhbWVDb3VudCAvIDEwMCksXG4gICAgICAwLFxuICAgICAgMSxcbiAgICAgIC0xLFxuICAgICAgMVxuICAgICk7XG4gICAgb2Zmc2V0LnkgPSBtYXAobm9pc2UodGhpcy5tb3ZlbWVudFBoYXNlICsgZnJhbWVDb3VudCAvIDEwMCksIDAsIDEsIC0xLCAxKTtcblxuICAgIHRoaXMuc2V0UG9zaXRpb24odGhpcy5wb3MuY29weSgpLmFkZChvZmZzZXQpKTtcblxuICAgIHRoaXMucmF5ID0gbmV3IFJheSh0aGlzLnBvcywgeyB0YXJnZXQ6IHRhcmdldFBvcywgd2FsbHM6IHdhbGxzIH0pO1xuICB9XG59XG4iLCIvL1RPRE86IG5hbWVzcGFjZSB0aGlzXG5pbnRlcmZhY2UgRGlzdGFuY2VzQnVmZmVyIHtcbiAgdmFsdWVzOiBudW1iZXJbXTtcbn1cbmZ1bmN0aW9uIG1ha2VEaXN0YW5jZXNCdWZmZXIocmF5czogUmF5W10pOiBEaXN0YW5jZXNCdWZmZXIge1xuICAvL2NvbnN0IGZha2VEYXRhID0gZ2VuZXJhdGVGYWtlRGF0YSg0MCk7XG4gIHJldHVybiBnZW5lcmF0ZURhdGFGcm9tUmF5cyhyYXlzKTtcbn1cbmZ1bmN0aW9uIGdlbmVyYXRlRGF0YUZyb21SYXlzKHJheXM6IFJheVtdKTogRGlzdGFuY2VzQnVmZmVyIHtcbiAgcmV0dXJuIHtcbiAgICB2YWx1ZXM6IHJheXMubWFwKHJheSA9PiB7XG4gICAgICBjb25zdCBwdCA9IHJheS5uZWFyZXN0SW50ZXJzZWN0aW9uKCk7XG4gICAgICByZXR1cm4gcHQgPyBwdC5tYWcoKSA6IHdpZHRoO1xuICAgIH0pXG4gIH07XG59XG5mdW5jdGlvbiBnZW5lcmF0ZUZha2VEYXRhKG51bVN0cmlwczogbnVtYmVyKTogRGlzdGFuY2VzQnVmZmVyIHtcbiAgY29uc3QgYnVmZjogbnVtYmVyW10gPSBbXTtcbiAgcmVwZWF0KG51bVN0cmlwcywgaXggPT4ge1xuICAgIGJ1ZmYucHVzaChub2lzZShpeCAvIDIwLCBmcmFtZUNvdW50IC8gMjAwKSAqIHdpZHRoKTtcbiAgfSk7XG4gIHJldHVybiB7IHZhbHVlczogYnVmZiB9O1xufVxuXG5mdW5jdGlvbiBkcmF3RGlzdGFuY2VzQnVmZmVyKGRpc3RzOiBEaXN0YW5jZXNCdWZmZXIpIHtcbiAgY29uc3QgbnVtU3RyaXBzID0gZGlzdHMudmFsdWVzLmxlbmd0aDtcbiAgY29uc3Qgc3RyaXBXaWR0aCA9IHdpZHRoIC8gbnVtU3RyaXBzO1xuICBkaXN0cy52YWx1ZXMuZm9yRWFjaCgoZGlzdCwgaXgpID0+IHtcbiAgICBjb25zdCB4ID0gaXggKiBzdHJpcFdpZHRoO1xuICAgIGNvbnN0IHkgPSBtYXAoZGlzdCwgMCwgd2lkdGgsIGhlaWdodCwgMCk7XG4gICAgbm9TdHJva2UoKTtcbiAgICByZWN0TW9kZShDRU5URVIpO1xuICAgIHJlY3QoeCwgaGVpZ2h0IC8gMiwgc3RyaXBXaWR0aCwgeSk7XG4gIH0pO1xufVxuIiwiY2xhc3MgUGFsZXR0ZSB7XG4gIHN0YXRpYyBnZXRDb2xvcnMoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIGNvbG9yKDI1MCwgMTA1LCAwKSxcbiAgICAgIGNvbG9yKDEwNSwgMjEwLCAyMzEpLFxuICAgICAgY29sb3IoMTY3LCAyMTksIDIxNiksXG4gICAgICBjb2xvcigyNDMsIDEzNCwgNDgpXG4gICAgXTtcbiAgfVxuICBzdGF0aWMgcmFuZG9tQ29sb3IoKTogcDUuQ29sb3Ige1xuICAgIHJldHVybiByYW5kb20oUGFsZXR0ZS5nZXRDb2xvcnMoKSk7XG4gIH1cbn1cbiIsImNsYXNzIFBhcnRpY2xlIHtcbiAgcG9zOiBwNS5WZWN0b3I7XG4gIGhlYWRpbmc6IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwb3M6IHA1LlZlY3Rvcikge1xuICAgIHRoaXMucG9zID0gcG9zLmNvcHkoKTtcbiAgICB0aGlzLmhlYWRpbmcgPSAwO1xuICB9XG4gIGRyYXcoKSB7XG4gICAgbm9TdHJva2UoKTtcbiAgICBmaWxsKFwiYmxhY2tcIik7XG4gICAgcmVjdE1vZGUoQ0VOVEVSKTtcbiAgICBzcXVhcmUodGhpcy5wb3MueCwgdGhpcy5wb3MueSwgMyk7XG4gICAgZmlsbCgwLCAyMCk7XG4gIH1cbiAgdXBkYXRlKCkge1xuICAgIGNvbnN0IG1vdXNlTW92ZW1lbnRBbmdsZSA9IGFuZ2xlT2ZMYXN0TW91c2VNb3ZlbWVudCgpO1xuICAgIGlmIChtb3VzZU1vdmVtZW50QW5nbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5oZWFkaW5nID0gbW91c2VNb3ZlbWVudEFuZ2xlO1xuICAgIH1cbiAgfVxuXG4gIHNldFBvc2l0aW9uKHBvczogcDUuVmVjdG9yKSB7XG4gICAgdGhpcy5wb3MueCA9IHBvcy54O1xuICAgIHRoaXMucG9zLnkgPSBwb3MueTtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSYW5kb20oKSB7XG4gICAgcmV0dXJuIG5ldyBQYXJ0aWNsZShyYW5kb21TY3JlZW5Qb3NpdGlvbigpKTtcbiAgfVxufVxuIiwiaW50ZXJmYWNlIFJheU9wdGlvbnMge1xuICBhbmdsZVJhZHM/OiBudW1iZXI7XG4gIHRhcmdldD86IHA1LlZlY3RvcjsgLy9UT0RPOiBleGFjdGx5IG9uZSBvZiB0YXJnZXQgYW5kIGFuZ2xlUmFkcyBpcyByZXF1aXJlZC5cbiAgd2FsbHM/OiBXYWxsW107XG59XG5jbGFzcyBSYXkge1xuICAvL1RPRE86IHNwbGl0IHRoaXMgb3V0IGludG8gYW4gYWdlbnQgd2hpY2ggaGFzIGFuIG9yaWdpbiBhbmQgYSByYXksIHdpdGggdGhlIHJheSBoYW5kbGluZyBvbmx5IGhhbmRsaW5nIGRlY2lkaW5nIGxpbmUgb2Ygc2lnaHQgYW5kIGludGVyc2VjdGlvbiBwb2ludHMuXG4gIHN0YXRpYyBpc1JlbmRlckFzQ29id2ViID0gZmFsc2U7XG4gIHN0YXRpYyBpc0RyYXdHaG9zdFJheTogYm9vbGVhbiA9IHRydWU7XG4gIHN0YXRpYyBpc0RyYXdSYXlUb0ZpcnN0SW50ZXJzZWN0aW9uOiBib29sZWFuID0gdHJ1ZTtcbiAgc3RhdGljIGlzRHJhd0ludGVyc2VjdGlvbnM6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBvcmlnaW46IHA1LlZlY3RvcjtcblxuICAvL3JheSBpcyBjb25jZXB0dWFsbHkgaW5maW5pdGUgbGVuZ3RoIHdpdGggb25seSBvbmUgZW5kLCBidXQgdGhpcyBoYWNrIGlzIHVzZWZ1bCBmb3IgaW50ZXJzZWN0aW9uIGFuZCByZW5kZXJpbmcuXG4gIGZhckVuZDogcDUuVmVjdG9yOyAvL2EgaGFjay4gIG9mZnNjcmVlbiBcImZhciBlbmRcIi5cblxuICBhbmdsZVJhZHM6IHA1LlZlY3RvcjtcbiAgaW50ZXJzZWN0aW9uUG9pbnRzOiBwNS5WZWN0b3JbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBvcmlnaW46IHA1LlZlY3RvcixcbiAgICB7IGFuZ2xlUmFkcyA9IG51bGwsIHRhcmdldCA9IG51bGwsIHdhbGxzID0gW10gfTogUmF5T3B0aW9uc1xuICApIHtcbiAgICB0aGlzLm9yaWdpbiA9IG9yaWdpbi5jb3B5KCk7XG4gICAgaWYgKHRhcmdldCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5sb29rQXQodGFyZ2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbmdsZVJhZHMgPSBwNS5WZWN0b3IuZnJvbUFuZ2xlKGFuZ2xlUmFkcyk7XG4gICAgfVxuICAgIHRoaXMuaW50ZXJzZWN0aW9uUG9pbnRzID0gW107XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUZhckVuZCgpO1xuICAgIGlmICh3YWxscy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnJlY2FsY3VsYXRlSW50ZXJzZWN0aW9ucyh3YWxscyk7XG4gICAgfVxuICB9XG5cbiAgbG9va0F0KHRhcmdldFBvczogcDUuVmVjdG9yKTogdm9pZCB7XG4gICAgY29uc3QgZGVsdGFUb1RhcmdldCA9IHRhcmdldFBvcy5jb3B5KCkuc3ViKHRoaXMub3JpZ2luKTtcbiAgICAvL25vdGU6IHBhcmFtIG9yZGVyOiB5IHRoZW4geFxuICAgIGNvbnN0IGFuZ2xlVG9UYXJnZXQgPSBhdGFuMihkZWx0YVRvVGFyZ2V0LnksIGRlbHRhVG9UYXJnZXQueCk7XG4gICAgdGhpcy5hbmdsZVJhZHMgPSBwNS5WZWN0b3IuZnJvbUFuZ2xlKGFuZ2xlVG9UYXJnZXQpO1xuICAgIHRoaXMucmVjYWxjdWxhdGVGYXJFbmQoKTtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSYW5kb20oKTogUmF5IHtcbiAgICByZXR1cm4gbmV3IFJheShyYW5kb21TY3JlZW5Qb3NpdGlvbigpLCB7IGFuZ2xlUmFkczogcmFuZG9tKDAsIFRXT19QSSkgfSk7XG4gIH1cbiAgaW50ZXJzZWN0aW9uV2l0aFdhbGwod2FsbDogV2FsbCk6IHA1LlZlY3RvciB7XG4gICAgLy9UT0RPOiBjdXN0b21pc2UgYSBmbiB0byBjb2xsaWRlTGluZVNlZ1dpdGhSYXksXG4gICAgLy9yYXRoZXIgdGhhbiBMaW5lU2VnIHdpdGggTGluZVNlZ1xuICAgIGNvbnN0IGFuc3dlciA9IGNvbGxpZGVMaW5lTGluZShcbiAgICAgIHdhbGwuYS54LFxuICAgICAgd2FsbC5hLnksXG4gICAgICB3YWxsLmIueCxcbiAgICAgIHdhbGwuYi55LFxuICAgICAgdGhpcy5vcmlnaW4ueCxcbiAgICAgIHRoaXMub3JpZ2luLnksXG4gICAgICB0aGlzLmZhckVuZC54LFxuICAgICAgdGhpcy5mYXJFbmQueVxuICAgICk7XG5cbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XG5cbiAgbmVhcmVzdEludGVyc2VjdGlvbigpOiBwNS5WZWN0b3Ige1xuICAgIGlmICh0aGlzLmludGVyc2VjdGlvblBvaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gbWluQnkoXG4gICAgICAgIHRoaXMuaW50ZXJzZWN0aW9uUG9pbnRzLFxuICAgICAgICAocHQ6IHA1LlZlY3RvcikgPT4gLXRoaXMub3JpZ2luLmRpc3QocHQpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICBjYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzOiBXYWxsW10pOiBwNS5WZWN0b3JbXSB7XG4gICAgY29uc3QgcmVzOiBwNS5WZWN0b3JbXSA9IFtdO1xuICAgIGZvciAobGV0IHdhbGwgb2Ygd2FsbHMpIHtcbiAgICAgIGNvbnN0IGludGVyc2VjdGlvbiA9IHRoaXMuaW50ZXJzZWN0aW9uV2l0aFdhbGwod2FsbCk7XG4gICAgICBpZiAoaW50ZXJzZWN0aW9uKSB7XG4gICAgICAgIHJlcy5wdXNoKGludGVyc2VjdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbiAgcmVjYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzOiBXYWxsW10pOiB2b2lkIHtcbiAgICB0aGlzLmludGVyc2VjdGlvblBvaW50cyA9IHRoaXMuY2FsY3VsYXRlSW50ZXJzZWN0aW9ucyh3YWxscyk7XG4gIH1cblxuICByZWNhbGN1bGF0ZUZhckVuZCgpOiB2b2lkIHtcbiAgICB0aGlzLmZhckVuZCA9IHRoaXMub3JpZ2luLmNvcHkoKS5hZGQodGhpcy5hbmdsZVJhZHMuY29weSgpLm11bHQod2lkdGgpKTtcbiAgfVxuXG4gIGRyYXdMaXRMaW5lU2VnbWVudChhOiBwNS5WZWN0b3IsIGI6IHA1LlZlY3Rvcik6IHZvaWQge1xuICAgIGlmIChSYXkuaXNSZW5kZXJBc0NvYndlYikge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyMDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHB0ID0gYS5jb3B5KCkubGVycChiLCBpIC8gMTApO1xuICAgICAgICBzcXVhcmUocHQueCwgcHQueSwgMSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpbmUoYS54LCBhLnksIGIueCwgYi55KTtcbiAgICB9XG4gIH1cblxuICBkcmF3UmF5VW50aWxGaXJzdEludGVyc2VjdGlvbigpOiB2b2lkIHtcbiAgICBjb25zdCBvID0gdGhpcy5vcmlnaW47XG4gICAgY29uc3QgZW5kID0gby5jb3B5KCkuYWRkKHRoaXMuYW5nbGVSYWRzLmNvcHkoKS5tdWx0KDQwKSk7XG5cbiAgICAvL2RyYXcgdG8gZmFyIChvZmYtc2NyZWVuKSBlbmRcbiAgICBpZiAoUmF5LmlzRHJhd0dob3N0UmF5KSB7XG4gICAgICBzdHJva2UoMjU1LCAyNTUsIDI1NSwgMTApO1xuICAgICAgc3Ryb2tlV2VpZ2h0KDAuMyk7XG4gICAgICBsaW5lKG8ueCwgby55LCB0aGlzLmZhckVuZC54LCB0aGlzLmZhckVuZC55KTtcbiAgICB9XG4gICAgY29uc3QgbmVhclB0ID0gdGhpcy5uZWFyZXN0SW50ZXJzZWN0aW9uKCk7XG4gICAgaWYgKFJheS5pc0RyYXdSYXlUb0ZpcnN0SW50ZXJzZWN0aW9uKSB7XG4gICAgICBpZiAobmVhclB0KSB7XG4gICAgICAgIHN0cm9rZShcIndoaXRlXCIpO1xuICAgICAgICBzdHJva2VXZWlnaHQoMik7XG4gICAgICAgIHRoaXMuZHJhd0xpdExpbmVTZWdtZW50KG8sIG5lYXJQdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKFJheS5pc0RyYXdJbnRlcnNlY3Rpb25zKSB7XG4gICAgICBmb3IgKGxldCBpUHQgb2YgdGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMpIHtcbiAgICAgICAgZmlsbChcImdyYXlcIik7XG4gICAgICAgIGNpcmNsZShpUHQueCwgaVB0LnksIDIpO1xuICAgICAgfVxuICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLm5lYXJlc3RJbnRlcnNlY3Rpb24oKTtcbiAgICAgIGlmIChmaXJzdCkge1xuICAgICAgICBmaWxsKFwid2hpdGVcIik7XG4gICAgICAgIGNpcmNsZShmaXJzdC54LCBmaXJzdC55LCAyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgY2FuU2VlUG9pbnQodGFyZ2V0OiBwNS5WZWN0b3IpOiBib29sZWFuIHtcbiAgICBjb25zdCBuZWFyZXN0SXNlY3Q6IHA1LlZlY3RvciA9IHRoaXMubmVhcmVzdEludGVyc2VjdGlvbigpO1xuICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IHRoaXMub3JpZ2luLmRpc3QodGFyZ2V0KTtcbiAgICByZXR1cm4gIShuZWFyZXN0SXNlY3QgJiYgdGhpcy5vcmlnaW4uZGlzdChuZWFyZXN0SXNlY3QpIDwgZGlzdFRvVGFyZ2V0KTtcbiAgfVxufVxuIiwiY2xhc3MgU3RydWN0dXJlIHtcbiAgaXNGaWxsZWRTaGFwZSA9IGZhbHNlO1xuICBjZW50ZXI6IHA1LlZlY3RvcjtcbiAgYWJzdHJhY3RWZXJ0aWNlczogcDUuVmVjdG9yW107XG4gIHdhbGxzOiBXYWxsW107XG4gIG1vdmVtZW50U3BlZWQ6IG51bWJlcjtcbiAgbXlDb2xvcjogcDUuQ29sb3I7XG4gIHJvdGF0aW9uOiBudW1iZXI7XG4gIHJvdGF0aW9uU3BlZWQ6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihjZW50ZXI6IHA1LlZlY3RvciwgcmFkaXVzOiBudW1iZXIsIG51bVNpZGVzOiBudW1iZXIpIHtcbiAgICB0aGlzLnJvdGF0aW9uID0gcmFuZG9tKFRXT19QSSk7XG4gICAgdGhpcy5teUNvbG9yID0gUGFsZXR0ZS5yYW5kb21Db2xvcigpO1xuICAgIHRoaXMubW92ZW1lbnRTcGVlZCA9IC1yYW5kb20oMC4yLCAyKTtcbiAgICB0aGlzLnJvdGF0aW9uU3BlZWQgPSByYW5kb20oLTAuMDEsIDAuMDEpO1xuICAgIHRoaXMuYWJzdHJhY3RWZXJ0aWNlcyA9IHRoaXMuY3JlYXRlVmVydGljZXNGb3JTaGFwZVdpdGhOdW1TaWRlcyhcbiAgICAgIGNlbnRlcixcbiAgICAgIHJhZGl1cyxcbiAgICAgIG51bVNpZGVzXG4gICAgKTtcblxuICAgIHRoaXMud2FsbHMgPSB0aGlzLm1ha2VXYWxsc0Zyb21WZXJ0aWNlcyhcbiAgICAgIHRoaXMuYWJzdHJhY3RWZXJ0aWNlcyxcbiAgICAgIHRoaXMubXlDb2xvclxuICAgICk7XG4gIH1cblxuICBjcmVhdGVWZXJ0aWNlc0ZvclNoYXBlV2l0aE51bVNpZGVzKFxuICAgIGNlbnRlcjogcDUuVmVjdG9yLFxuICAgIHJhZGl1czogbnVtYmVyLFxuICAgIG51bVNpZGVzOiBudW1iZXJcbiAgKTogcDUuVmVjdG9yW10ge1xuICAgIGNvbnN0IHZlcnRpY2VzID0gW107XG4gICAgLy9zcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSB3YWxsXG4gICAgaWYgKG51bVNpZGVzID09PSAxKSB7XG4gICAgICBsZXQgW2EsIGJdID0gdGhpcy5jcmVhdGVSYW5kb21MaW5lU2VnKCk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKGEpO1xuICAgICAgdmVydGljZXMucHVzaChiKTtcbiAgICAgIHRoaXMuY2VudGVyID0gYS5jb3B5KCkubGVycChiLCAwLjUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNlbnRlciA9IGNlbnRlci5jb3B5KCk7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU2lkZXM7IGkrKykge1xuICAgICAgICBjb25zdCBhbmdsZSA9IChpICogVFdPX1BJKSAvIG51bVNpZGVzO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoKFxuICAgICAgICAgIHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGUpXG4gICAgICAgICAgICAubXVsdChyYWRpdXMpXG4gICAgICAgICAgICAuYWRkKHRoaXMuY2VudGVyKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmVydGljZXM7XG4gIH1cbiAgbWFrZVdhbGxzRnJvbVZlcnRpY2VzKHZzOiBwNS5WZWN0b3JbXSwgbXlDb2xvcjogcDUuQ29sb3IpOiBXYWxsW10ge1xuICAgIGNvbnN0IHdhbGxzOiBXYWxsW10gPSBbXTtcbiAgICBpZiAodnMubGVuZ3RoID09PSAyKSB7XG4gICAgICBjb25zdCBzaW5nbGVXYWxsID0gbmV3IFdhbGwodnNbMF0sIHZzWzFdKTtcbiAgICAgIHNpbmdsZVdhbGwubXlDb2xvciA9IG15Q29sb3I7XG4gICAgICB3YWxscy5wdXNoKHNpbmdsZVdhbGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBudW1TaWRlcyA9IHZzLmxlbmd0aDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU2lkZXM7IGkrKykge1xuICAgICAgICBjb25zdCBhID0gdnNbaV07XG4gICAgICAgIGNvbnN0IGIgPSBpID09PSBudW1TaWRlcyAtIDEgPyB2c1swXSA6IHZzW2kgKyAxXTtcbiAgICAgICAgY29uc3Qgd2FsbCA9IG5ldyBXYWxsKGEsIGIpO1xuICAgICAgICB3YWxsLm15Q29sb3IgPSBteUNvbG9yO1xuICAgICAgICB3YWxscy5wdXNoKHdhbGwpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd2FsbHM7XG4gIH1cbiAgY3JlYXRlUmFuZG9tTGluZVNlZygpOiBwNS5WZWN0b3JbXSB7XG4gICAgY29uc3QgcDEgPSByYW5kb21TY3JlZW5Qb3NpdGlvbigpO1xuICAgIGNvbnN0IHAyID0gcDEuY29weSgpLmFkZChwNS5WZWN0b3IucmFuZG9tMkQoKS5tdWx0KHJhbmRvbSg0MCwgNDAwKSkpO1xuICAgIHJldHVybiBbcDEsIHAyXTtcbiAgfVxuXG4gIHJvdGF0ZShhbmdsZVJhZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5yb3RhdGlvbiArPSBhbmdsZVJhZDtcbiAgICBjb25zdCByb3RhdGVkVmVydGljZXMgPSB0aGlzLmFic3RyYWN0VmVydGljZXMubWFwKHYgPT5cbiAgICAgIHJvdGF0ZVZlcnRleEFyb3VuZCh2LCB0aGlzLmNlbnRlciwgdGhpcy5yb3RhdGlvbilcbiAgICApO1xuXG4gICAgLy9yZW1ha2UgdGhlIHdhbGxzXG4gICAgdGhpcy53YWxscyA9IHRoaXMubWFrZVdhbGxzRnJvbVZlcnRpY2VzKHJvdGF0ZWRWZXJ0aWNlcywgdGhpcy5teUNvbG9yKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgbW92ZUFtdDogbnVtYmVyID0gdGhpcy5tb3ZlbWVudFNwZWVkO1xuICAgIGlmICh0aGlzLmNlbnRlci54ICsgbW92ZUFtdCA8IDApIHtcbiAgICAgIG1vdmVBbXQgKz0gd2lkdGg7XG4gICAgfVxuICAgIHRoaXMuY2VudGVyLnggKz0gbW92ZUFtdDtcbiAgICAvL3JlbWFrZSB0aGUgd2FsbHNcbiAgICB0aGlzLndhbGxzID0gdGhpcy5tYWtlV2FsbHNGcm9tVmVydGljZXMoXG4gICAgICB0aGlzLmFic3RyYWN0VmVydGljZXMubWFwKHYgPT4gdi5hZGQoY3JlYXRlVmVjdG9yKG1vdmVBbXQsIDApKSksXG4gICAgICB0aGlzLm15Q29sb3JcbiAgICApO1xuXG4gICAgdGhpcy5yb3RhdGUodGhpcy5yb3RhdGlvblNwZWVkKTtcbiAgfVxuICBkcmF3KCkge1xuICAgIGZvciAobGV0IHdhbGwgb2YgdGhpcy53YWxscykge1xuICAgICAgd2FsbC5kcmF3KCk7XG4gICAgfVxuICAgIC8vY2lyY2xlKHRoaXMuY2VudGVyLngsIHRoaXMuY2VudGVyLnksIDUpO1xuICAgIGlmICh0aGlzLmlzRmlsbGVkU2hhcGUpIHtcbiAgICAgIGJlZ2luU2hhcGUoKTtcbiAgICAgIGZvciAobGV0IHdhbGwgb2YgdGhpcy53YWxscykge1xuICAgICAgICBmb3IgKGxldCBwdCBvZiBbd2FsbC5hLCB3YWxsLmJdKSB7XG4gICAgICAgICAgdmVydGV4KHB0LngsIHB0LnkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbmRTaGFwZShDTE9TRSk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpIHtcbiAgICBjb25zdCBjZW50ZXIgPSByYW5kb21TY3JlZW5Qb3NpdGlvbigpO1xuICAgIGNvbnN0IG51bVNpZGVzID0gcmFuZG9tKFsxLCAxLCAxLCAzLCA0LCA1LCA2XSk7XG4gICAgcmV0dXJuIG5ldyBTdHJ1Y3R1cmUoY2VudGVyLCByYW5kb20oMjAsIHJhbmRvbSgxMDAsIDIwMCkpLCBudW1TaWRlcyk7XG4gIH1cbn1cbiIsImZ1bmN0aW9uIHJlcGVhdChudW06IG51bWJlciwgZm46IChpeDogbnVtYmVyKSA9PiB2b2lkKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtOyBpKyspIHtcbiAgICBmbihpKTtcbiAgfVxufVxuZnVuY3Rpb24gcmFuZG9tU2NyZWVuUG9zaXRpb24oKTogcDUuVmVjdG9yIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3RvcihyYW5kb20od2lkdGgpLCByYW5kb20oaGVpZ2h0KSk7XG59XG5cbmZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gcm91bmQocmFuZG9tKG1pbiwgbWF4KSk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvVmVjKHBvczogcDUuVmVjdG9yKTogdm9pZCB7XG4gIHRyYW5zbGF0ZShwb3MueCwgcG9zLnkpO1xufVxuXG5mdW5jdGlvbiBjZW50ZXJQb3MoKTogcDUuVmVjdG9yIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3Rvcih3aWR0aCAvIDIsIGhlaWdodCAvIDIpO1xufVxuZnVuY3Rpb24gcm90YXRlVmVydGV4QXJvdW5kKFxuICB2ZXJ0ZXg6IHA1LlZlY3RvcixcbiAgcm90T3JpZ2luOiBwNS5WZWN0b3IsXG4gIGFuZ2xlUmFkOiBudW1iZXJcbik6IHA1LlZlY3RvciB7XG4gIHJldHVybiB2ZXJ0ZXhcbiAgICAuY29weSgpXG4gICAgLnN1Yihyb3RPcmlnaW4pXG4gICAgLnJvdGF0ZShhbmdsZVJhZClcbiAgICAuYWRkKHJvdE9yaWdpbik7XG59XG5cbi8vVGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYm1vcmVuL3A1LmNvbGxpZGUyRFxuZnVuY3Rpb24gY29sbGlkZUxpbmVMaW5lKFxuICB4MTogbnVtYmVyLFxuICB5MTogbnVtYmVyLFxuICB4MjogbnVtYmVyLFxuICB5MjogbnVtYmVyLFxuICB4MzogbnVtYmVyLFxuICB5MzogbnVtYmVyLFxuICB4NDogbnVtYmVyLFxuICB5NDogbnVtYmVyXG4pIHtcbiAgLy8gY2FsY3VsYXRlIHRoZSBkaXN0YW5jZSB0byBpbnRlcnNlY3Rpb24gcG9pbnRcbiAgbGV0IHVBID1cbiAgICAoKHg0IC0geDMpICogKHkxIC0geTMpIC0gKHk0IC0geTMpICogKHgxIC0geDMpKSAvXG4gICAgKCh5NCAtIHkzKSAqICh4MiAtIHgxKSAtICh4NCAtIHgzKSAqICh5MiAtIHkxKSk7XG4gIGxldCB1QiA9XG4gICAgKCh4MiAtIHgxKSAqICh5MSAtIHkzKSAtICh5MiAtIHkxKSAqICh4MSAtIHgzKSkgL1xuICAgICgoeTQgLSB5MykgKiAoeDIgLSB4MSkgLSAoeDQgLSB4MykgKiAoeTIgLSB5MSkpO1xuXG4gIC8vIGlmIHVBIGFuZCB1QiBhcmUgYmV0d2VlbiAwLTEsIGxpbmVzIGFyZSBjb2xsaWRpbmdcbiAgaWYgKHVBID49IDAgJiYgdUEgPD0gMSAmJiB1QiA+PSAwICYmIHVCIDw9IDEpIHtcbiAgICAvLyBjYWxjIHRoZSBwb2ludCB3aGVyZSB0aGUgbGluZXMgbWVldFxuICAgIGxldCBpbnRlcnNlY3Rpb25YID0geDEgKyB1QSAqICh4MiAtIHgxKTtcbiAgICBsZXQgaW50ZXJzZWN0aW9uWSA9IHkxICsgdUEgKiAoeTIgLSB5MSk7XG5cbiAgICByZXR1cm4gY3JlYXRlVmVjdG9yKGludGVyc2VjdGlvblgsIGludGVyc2VjdGlvblkpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBtaW5CeTxUPihsaXN0OiBUW10sIGZuOiAoaXRlbTogVCkgPT4gbnVtYmVyKTogVCB7XG4gIGlmIChsaXN0Lmxlbmd0aCA8IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgcmVjb3JkSXRlbSA9IGxpc3RbMF07XG4gIGxldCByZWNvcmRXZWlnaHQgPSBmbihsaXN0WzBdKTtcbiAgZm9yIChsZXQgaXRlbSBvZiBsaXN0KSB7XG4gICAgY29uc3Qgd2VpZ2h0ID0gZm4oaXRlbSk7XG4gICAgaWYgKHdlaWdodCA+IHJlY29yZFdlaWdodCkge1xuICAgICAgcmVjb3JkV2VpZ2h0ID0gd2VpZ2h0O1xuICAgICAgcmVjb3JkSXRlbSA9IGl0ZW07XG4gICAgfVxuICB9XG4gIHJldHVybiByZWNvcmRJdGVtO1xufVxuXG5mdW5jdGlvbiBkaXN0cmlidXRlVXBUbyh0b3RhbDogbnVtYmVyLCBtYXg6IG51bWJlciwgZm46ICh2OiBudW1iZXIpID0+IHZvaWQpIHtcbiAgcmVwZWF0KHRvdGFsLCBpeCA9PiB7XG4gICAgY29uc3QgdmFsID0gKGl4ICogbWF4KSAvIHRvdGFsO1xuICAgIGZuKHZhbCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBkaXN0cmlidXRlQmV0d2VlbihcbiAgbnVtU2FtcGxlczogbnVtYmVyLFxuICBtaW46IG51bWJlcixcbiAgbWF4OiBudW1iZXIsXG4gIGZuOiAodjogbnVtYmVyKSA9PiB2b2lkXG4pIHtcbiAgcmVwZWF0KG51bVNhbXBsZXMsIGl4ID0+IHtcbiAgICBjb25zdCByYW5nZSA9IG1heCAtIG1pbjtcbiAgICBjb25zdCB2YWwgPSBtaW4gKyAoaXggKiByYW5nZSkgLyBudW1TYW1wbGVzO1xuICAgIGZuKHZhbCk7XG4gIH0pO1xufVxuZnVuY3Rpb24gYXZlcmFnZVZlY3RvcnModnM6IHA1LlZlY3RvcltdKTogcDUuVmVjdG9yIHtcbiAgaWYgKHZzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4gY3JlYXRlVmVjdG9yKDAsIDApO1xuICB9XG4gIHJldHVybiB2cy5yZWR1Y2UoKHYxLCB2MikgPT4gdjEuY29weSgpLmFkZCh2MiksIHZzWzBdKS5kaXYodnMubGVuZ3RoKTtcbn1cblxuLy9UT0RPOiBkb24ndCBwb2xsdXRlIGdsb2JhbFxuY29uc3QgZ0xhc3RNb3VzZU1vdmVtZW50czogcDUuVmVjdG9yW10gPSBbXTtcblxuLy9UT0RPOiBzbW9vdGggdGhpcyBvdXQgYnkgYnVmZmVyaW5nIGEgZmV3IG1vdmVtZW50c1xuLy9NYWludGFpbiB0aGUgcHJldmlvdXMgYW5nbGUgaWYgdGhlcmUncyBiZWVuIG5vIG1vdmVtZW50XG5mdW5jdGlvbiBhbmdsZU9mTGFzdE1vdXNlTW92ZW1lbnQoKTogbnVtYmVyIHtcbiAgY29uc3QgZGVsdGEgPSBjcmVhdGVWZWN0b3IobW91c2VYIC0gcG1vdXNlWCwgbW91c2VZIC0gcG1vdXNlWSk7XG4gIGlmIChkZWx0YS5tYWdTcSgpIDwgMSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgZ0xhc3RNb3VzZU1vdmVtZW50cy51bnNoaWZ0KGRlbHRhKTtcbiAgICBnTGFzdE1vdXNlTW92ZW1lbnRzLnNwbGljZSg4KTtcbiAgICBjb25zdCBhdmdNb3ZlbWVudCA9IGF2ZXJhZ2VWZWN0b3JzKGdMYXN0TW91c2VNb3ZlbWVudHMpO1xuXG4gICAgLy9hdmVyYWdlIG1pZ2h0IGhhdmUgY2FuY2VsbGVkIG91dCBhbmQgdGhlcmVmb3JlIGhhdmUgbm8gaGVhZGluZ1xuICAgIGlmIChhdmdNb3ZlbWVudC5tYWcoKSA+IDApIHtcbiAgICAgIHJldHVybiBhdmdNb3ZlbWVudC5oZWFkaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG59XG4iLCJjbGFzcyBXYWxsIHtcbiAgYTogcDUuVmVjdG9yO1xuICBiOiBwNS5WZWN0b3I7XG5cbiAgbXlDb2xvcjogcDUuQ29sb3I7XG5cbiAgY29uc3RydWN0b3IoYTogcDUuVmVjdG9yLCBiOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLmEgPSBhLmNvcHkoKTtcbiAgICB0aGlzLmIgPSBiLmNvcHkoKTtcbiAgICB0aGlzLm15Q29sb3IgPSBjb2xvcigyNDMsIDEzNCwgNDgpO1xuICB9XG4gIGRyYXcoKSB7XG4gICAgc3Ryb2tlKHRoaXMubXlDb2xvcik7XG4gICAgc3Ryb2tlV2VpZ2h0KDQpO1xuICAgIGxpbmUodGhpcy5hLngsIHRoaXMuYS55LCB0aGlzLmIueCwgdGhpcy5iLnkpO1xuXG4gICAgbm9TdHJva2UoKTtcbiAgICBmaWxsKHRoaXMubXlDb2xvcik7XG4gICAgW3RoaXMuYSwgdGhpcy5iXS5mb3JFYWNoKHB0ID0+IHtcbiAgICAgIC8vY2lyY2xlKHB0LngsIHB0LnksIDUpO1xuICAgIH0pO1xuICB9XG4gIG1pZFBvaW50KCk6IHA1LlZlY3RvciB7XG4gICAgcmV0dXJuIHRoaXMuYS5jb3B5KCkubGVycCh0aGlzLmIsIDAuNSk7XG4gIH1cblxuICBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gZGlzdCh0aGlzLmEueCwgdGhpcy5hLnksIHRoaXMuYi54LCB0aGlzLmIueSk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmFuZG9tKCkge1xuICAgIGNvbnN0IHAxID0gcmFuZG9tU2NyZWVuUG9zaXRpb24oKTtcbiAgICBjb25zdCBwMiA9IHAxLmNvcHkoKS5hZGQocDUuVmVjdG9yLnJhbmRvbTJEKCkubXVsdChyYW5kb20oNDAsIDQwMCkpKTtcbiAgICByZXR1cm4gbmV3IFdhbGwocDEsIHAyKTtcbiAgfVxufVxuIl19