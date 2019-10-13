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
        colorMode(RGB);
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
function colorForPoint(_a, origin) {
    var c = _a.color, pt = _a.pt;
    var dist = origin.dist(pt);
    var lightness = map(dist, 0, width, 50, 3);
    colorMode(RGB);
    var _b = [hue(c), saturation(c)], h = _b[0], s = _b[1];
    colorMode(HSL, 100);
    return color(h, s, lightness);
}
function generateDataFromRays(rays) {
    return {
        values: rays.map(function (ray) {
            var nearest = ray.nearestIntersection();
            return nearest
                ? {
                    distance: nearest.pt.dist(ray.origin),
                    color: colorForPoint(nearest, ray.origin)
                }
                : { distance: width * 1.5, color: color("black") };
        })
    };
}
function drawDistancesBuffer(distantPoints) {
    var numStrips = distantPoints.values.length;
    var stripWidth = round(width / numStrips);
    distantPoints.values.forEach(function (_a, ix) {
        var distance = _a.distance, color = _a.color;
        var x = ix * stripWidth;
        var y = map(distance, 0, width, height * 0.7, 0);
        noStroke();
        fill(color);
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
var defaultRenderingOptions = {
    drawAsCobweb: false,
    drawGhostRay: false,
    drawRayToFirstIntersection: true,
    drawAllIntersections: false,
    drawFirstIntersection: true
};
var renderingOptions = randomRenderingOptions();
function randomiseRenderingOptions() {
    renderingOptions = randomRenderingOptions();
}
function randomRenderingOptions() {
    return {
        drawAsCobweb: randomBoolean(),
        drawGhostRay: randomBoolean(),
        drawRayToFirstIntersection: randomBoolean(),
        drawAllIntersections: randomBoolean(),
        drawFirstIntersection: randomBoolean()
    };
}
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
            return minBy(this.intersectionPoints, function (_a) {
                var pt = _a.pt, color = _a.color;
                return -_this.origin.dist(pt);
            });
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
                res.push({ pt: intersection, color: wall.myColor });
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
        stroke("white");
        if (renderingOptions.drawAsCobweb) {
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
        if (renderingOptions.drawGhostRay) {
            stroke(255, 255, 255, 10);
            strokeWeight(0.3);
            line(o.x, o.y, this.farEnd.x, this.farEnd.y);
        }
        var _a = this.nearestIntersection(), pt = _a.pt, color = _a.color;
        if (renderingOptions.drawRayToFirstIntersection) {
            if (pt) {
                stroke(color);
                strokeWeight(2);
                this.drawLitLineSegment(o, pt);
            }
        }
        if (renderingOptions.drawAllIntersections) {
            for (var _i = 0, _b = this.intersectionPoints; _i < _b.length; _i++) {
                var _c = _b[_i], pt_1 = _c.pt, color_1 = _c.color;
                fill("white");
                circle(pt_1.x, pt_1.y, 2);
            }
        }
        if (renderingOptions.drawFirstIntersection) {
            var first = this.nearestIntersection();
            if (first) {
                noStroke();
                fill(first.color);
                circle(first.pt.x, first.pt.y, 6);
            }
        }
    };
    Ray.prototype.canSeePoint = function (target) {
        var nearestIsect = this.nearestIntersection();
        var distToTarget = this.origin.dist(target);
        return !(nearestIsect && this.origin.dist(nearestIsect.pt) < distToTarget);
    };
    return Ray;
}());
var Structure = (function () {
    function Structure(center, radius, numSides) {
        this.isFilledShape = false;
        this.shouldRotate = false;
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
        if (this.shouldRotate) {
            this.rotate(this.rotationSpeed);
        }
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
function randomBoolean() {
    return Math.random() > 0.5;
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
var defaultAppOptions = {
    isMovingStructures: true,
    isRotatingStructures: true,
    isDrawingIn3D: false,
    isDrawStructures: true
};
var appOptions = randomAppOptions();
function randomAppOptions() {
    return {
        isMovingStructures: randomBoolean(),
        isRotatingStructures: randomBoolean(),
        isDrawStructures: randomBoolean(),
        isDrawingIn3D: randomBoolean()
    };
}
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
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), 0);
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
        var w = new Wall(pt1, pt2);
        w.myColor = color("darkgray");
        return w;
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
        if (appOptions.isMovingStructures) {
            s.shouldRotate = true;
            s.update();
        }
    }
    for (var _a = 0, gAgents_1 = gAgents; _a < gAgents_1.length; _a++) {
        var agent = gAgents_1[_a];
        agent.update(getAllWalls(), mousePosAsVector());
    }
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), gPlayer.heading);
}
function draw() {
    update();
    background(0);
    appOptions.isDrawingIn3D ? drawFake3D() : drawTopDown();
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
    drawDistancesBuffer(buff);
}
function drawTopDown() {
    fill("black");
    noStroke();
    if (appOptions.isDrawStructures) {
        for (var _i = 0, gStructures_2 = gStructures; _i < gStructures_2.length; _i++) {
            var s = gStructures_2[_i];
            s.draw();
        }
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
    appOptions.isDrawingIn3D = !appOptions.isDrawingIn3D;
}
function toggleMovingStructures() {
    appOptions.isMovingStructures = !appOptions.isMovingStructures;
}
function toggleRotatingStructures() {
    appOptions.isRotatingStructures = !appOptions.isRotatingStructures;
}
function mousePressed() {
    toggleMovingStructures();
}
function keyPressed() {
    if (key == "3") {
        toggle2D3D();
    }
    if (key == "r") {
        toggleRotatingStructures();
    }
    if (key == "o") {
        randomiseRenderingOptions();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiLi9qcy8iLCJzb3VyY2VzIjpbImluZGV4LnRzIiwiQWdlbnQudHMiLCJGYWtlM0QudHMiLCJQYWxldHRlLnRzIiwiUGFydGljbGUudHMiLCJSYXkudHMiLCJTdHJ1Y3R1cmUudHMiLCJVdGlscy50cyIsIldhbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FDQWI7SUFLRSxlQUFZLEdBQWM7UUFDeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxvQkFBSSxHQUFKO1FBQ0UsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyQyxJQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRW5CLFFBQVEsRUFBRSxDQUFDO1FBQ1gsSUFBSSxFQUFFLENBQUM7UUFDUCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1QsSUFBSSxVQUFVLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEMsVUFBVSxHQUFHLEVBQUUsQ0FBQztTQUNqQjthQUFNO1lBQ0wsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEdB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dXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xucDUuZGlzYWJsZUZyaWVuZGx5RXJyb3JzID0gdHJ1ZTtcbmludGVyZmFjZSBBcHBPcHRpb25zIHtcbiAgaXNNb3ZpbmdTdHJ1Y3R1cmVzOiBib29sZWFuO1xuICBpc1JvdGF0aW5nU3RydWN0dXJlczogYm9vbGVhbjtcbiAgaXNEcmF3aW5nSW4zRDogYm9vbGVhbjtcbiAgaXNEcmF3U3RydWN0dXJlczogYm9vbGVhbjtcbn1cbmxldCBkZWZhdWx0QXBwT3B0aW9uczogQXBwT3B0aW9ucyA9IHtcbiAgaXNNb3ZpbmdTdHJ1Y3R1cmVzOiB0cnVlLFxuICBpc1JvdGF0aW5nU3RydWN0dXJlczogdHJ1ZSxcbiAgaXNEcmF3aW5nSW4zRDogZmFsc2UsXG4gIGlzRHJhd1N0cnVjdHVyZXM6IHRydWVcbn07XG5sZXQgYXBwT3B0aW9uczogQXBwT3B0aW9ucyA9IHJhbmRvbUFwcE9wdGlvbnMoKTtcblxuZnVuY3Rpb24gcmFuZG9tQXBwT3B0aW9ucygpOiBBcHBPcHRpb25zIHtcbiAgcmV0dXJuIHtcbiAgICBpc01vdmluZ1N0cnVjdHVyZXM6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBpc1JvdGF0aW5nU3RydWN0dXJlczogcmFuZG9tQm9vbGVhbigpLFxuICAgIGlzRHJhd1N0cnVjdHVyZXM6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBpc0RyYXdpbmdJbjNEOiByYW5kb21Cb29sZWFuKClcbiAgfTtcbn1cblxubGV0IGdBZ2VudHM6IEFnZW50W10gPSBbXTtcbmxldCBnUGxheWVyUmF5czogUmF5W10gPSBbXTtcbmxldCBnUGxheWVyOiBQYXJ0aWNsZSA9IG51bGw7XG5sZXQgZ051bVdhbGxzOiBudW1iZXIgPSAyMDtcbmxldCBnTnVtQWdlbnRzOiBudW1iZXIgPSAxMDA7XG5sZXQgZ051bVBsYXllclJheXM6IG51bWJlciA9IDEwMDtcbmxldCBnTnVtU3RydWN0dXJlcyA9IDEwO1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBTRVRVUFxuICovXG5jb25zdCBnU3RydWN0dXJlczogU3RydWN0dXJlW10gPSBbXTtcbmZ1bmN0aW9uIHNldHVwKCkge1xuICBjcmVhdGVDYW52YXMod2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG5cbiAgcmVwZWF0KGdOdW1TdHJ1Y3R1cmVzLCAoKSA9PiB7XG4gICAgY29uc3Qgc3RydWN0dXJlID0gU3RydWN0dXJlLmNyZWF0ZVJhbmRvbSgpO1xuICAgIGdTdHJ1Y3R1cmVzLnB1c2goc3RydWN0dXJlKTtcbiAgfSk7XG5cbiAgcmVwZWF0KGdOdW1BZ2VudHMsICgpID0+IHtcbiAgICBnQWdlbnRzLnB1c2goQWdlbnQuY3JlYXRlUmFuZG9tKCkpO1xuICB9KTtcblxuICBnUGxheWVyUmF5cyA9IGNyZWF0ZVJheXNBdFBvc2l0aW9uKGdOdW1QbGF5ZXJSYXlzLCBtb3VzZVBvc0FzVmVjdG9yKCksIDApO1xuICBnUGxheWVyID0gUGFydGljbGUuY3JlYXRlUmFuZG9tKCk7XG4gIG1vdXNlWCA9IGNlbnRlclBvcygpLng7XG4gIG1vdXNlWSA9IGNlbnRlclBvcygpLnk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTY3JlZW5XYWxscygpOiBXYWxsW10ge1xuICBjb25zdCBbdGwsIHRyLCBiciwgYmxdID0gW1xuICAgIFswLCAwXSxcbiAgICBbd2lkdGgsIDBdLFxuICAgIFt3aWR0aCwgaGVpZ2h0XSxcbiAgICBbMCwgaGVpZ2h0XVxuICBdLm1hcCgoW3gsIHldKSA9PiBjcmVhdGVWZWN0b3IoeCwgeSkpO1xuICByZXR1cm4gW1t0bCwgdHJdLCBbdHIsIGJyXSwgW2JsLCBicl0sIFt0bCwgYmxdXS5tYXAoKFtwdDEsIHB0Ml0pID0+IHtcbiAgICBjb25zdCB3ID0gbmV3IFdhbGwocHQxLCBwdDIpO1xuICAgIHcubXlDb2xvciA9IGNvbG9yKFwiZGFya2dyYXlcIik7XG4gICAgcmV0dXJuIHc7XG4gIH0pO1xufVxuZnVuY3Rpb24gZ2V0QWxsV2FsbHMoKTogV2FsbFtdIHtcbiAgY29uc3Qgd2FsbHNGcm9tU3RydWN0dXJlcyA9IGdTdHJ1Y3R1cmVzLmZsYXRNYXAoXG4gICAgKHN0cnVjdHVyZTogU3RydWN0dXJlKSA9PiBzdHJ1Y3R1cmUud2FsbHNcbiAgKTtcbiAgY29uc3Qgc2NyZWVuV2FsbHMgPSBtYWtlU2NyZWVuV2FsbHMoKTtcbiAgcmV0dXJuIHNjcmVlbldhbGxzLmNvbmNhdCh3YWxsc0Zyb21TdHJ1Y3R1cmVzKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUmF5c0F0UG9zaXRpb24oXG4gIG51bVJheXM6IG51bWJlcixcbiAgcG9zOiBwNS5WZWN0b3IsXG4gIGhlYWRpbmc6IG51bWJlclxuKSB7XG4gIGNvbnN0IHJheXM6IFJheVtdID0gW107XG4gIGNvbnN0IGhhbGZGT1YgPSByYWRpYW5zKDMwKTtcbiAgZGlzdHJpYnV0ZUJldHdlZW4obnVtUmF5cywgaGVhZGluZyAtIGhhbGZGT1YsIGhlYWRpbmcgKyBoYWxmRk9WLCB2YWwgPT5cbiAgICByYXlzLnB1c2gobmV3IFJheShwb3MsIHsgYW5nbGVSYWRzOiB2YWwsIHdhbGxzOiBnZXRBbGxXYWxscygpIH0pKVxuICApO1xuXG4gIC8vIGRpc3RyaWJ1dGVVcFRvKG51bVJheXMsIFRXT19QSSAvIDgsIHZhbCA9PlxuICAvLyAgIHJheXMucHVzaChuZXcgUmF5KHBvcywgeyBhbmdsZVJhZHM6IHZhbCwgd2FsbHM6IGdldEFsbFdhbGxzKCkgfSkpXG4gIC8vICk7XG4gIHJldHVybiByYXlzO1xufVxuXG5mdW5jdGlvbiBtb3VzZVBvc0FzVmVjdG9yKCkge1xuICByZXR1cm4gY3JlYXRlVmVjdG9yKG1vdXNlWCwgbW91c2VZKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgZ1BsYXllci5zZXRQb3NpdGlvbihtb3VzZVBvc0FzVmVjdG9yKCkpO1xuICBnUGxheWVyLnVwZGF0ZSgpO1xuXG4gIGZvciAobGV0IHMgb2YgZ1N0cnVjdHVyZXMpIHtcbiAgICBpZiAoYXBwT3B0aW9ucy5pc01vdmluZ1N0cnVjdHVyZXMpIHtcbiAgICAgIHMuc2hvdWxkUm90YXRlID0gdHJ1ZTtcbiAgICAgIHMudXBkYXRlKCk7XG4gICAgfVxuICB9XG4gIGZvciAobGV0IGFnZW50IG9mIGdBZ2VudHMpIHtcbiAgICBhZ2VudC51cGRhdGUoZ2V0QWxsV2FsbHMoKSwgbW91c2VQb3NBc1ZlY3RvcigpKTtcbiAgfVxuXG4gIGdQbGF5ZXJSYXlzID0gY3JlYXRlUmF5c0F0UG9zaXRpb24oXG4gICAgZ051bVBsYXllclJheXMsXG4gICAgbW91c2VQb3NBc1ZlY3RvcigpLFxuICAgIGdQbGF5ZXIuaGVhZGluZ1xuICApO1xufVxuXG4vKlxuICogRFJBV1xuICovXG5mdW5jdGlvbiBkcmF3KCkge1xuICB1cGRhdGUoKTtcbiAgYmFja2dyb3VuZCgwKTtcbiAgYXBwT3B0aW9ucy5pc0RyYXdpbmdJbjNEID8gZHJhd0Zha2UzRCgpIDogZHJhd1RvcERvd24oKTtcbiAgZHJhd1BsYXllckRlYnVnSW5mbygpO1xufVxuXG5mdW5jdGlvbiBkcmF3UGxheWVyRGVidWdJbmZvKCkge1xuICBwdXNoKCk7XG4gIHRyYW5zbGF0ZShnUGxheWVyLnBvcy54LCBnUGxheWVyLnBvcy55KTtcbiAgbm9GaWxsKCk7XG4gIHN0cm9rZShcInB1cnBsZVwiKTtcbiAgY29uc3QgdmVjID0gcDUuVmVjdG9yLmZyb21BbmdsZShnUGxheWVyLmhlYWRpbmcpLm11bHQoNTApO1xuICBsaW5lKDAsIDAsIHZlYy54LCB2ZWMueSk7XG4gIGNpcmNsZSgwLCAwLCAxMCk7XG4gIHBvcCgpO1xufVxuZnVuY3Rpb24gZHJhd0Zha2UzRCgpIHtcbiAgYmFja2dyb3VuZChcImdyYXlcIik7XG4gIGNvbnN0IGJ1ZmYgPSBtYWtlRGlzdGFuY2VzQnVmZmVyKGdQbGF5ZXJSYXlzKTtcbiAgZHJhd0Rpc3RhbmNlc0J1ZmZlcihidWZmKTtcbn1cbmZ1bmN0aW9uIGRyYXdUb3BEb3duKCkge1xuICBmaWxsKFwiYmxhY2tcIik7XG4gIG5vU3Ryb2tlKCk7XG4gIGlmIChhcHBPcHRpb25zLmlzRHJhd1N0cnVjdHVyZXMpIHtcbiAgICBmb3IgKGxldCBzIG9mIGdTdHJ1Y3R1cmVzKSB7XG4gICAgICBzLmRyYXcoKTtcbiAgICB9XG4gIH1cbiAgZm9yIChsZXQgd2FsbCBvZiBnZXRBbGxXYWxscygpKSB7XG4gICAgd2FsbC5kcmF3KCk7XG4gIH1cblxuICBmb3IgKGxldCBhZ2VudCBvZiBnQWdlbnRzKSB7XG4gICAgYWdlbnQuZHJhdygpO1xuICB9XG4gIGZvciAobGV0IHJheSBvZiBnUGxheWVyUmF5cykge1xuICAgIHJheS5kcmF3UmF5VW50aWxGaXJzdEludGVyc2VjdGlvbigpO1xuICB9XG4gIGdQbGF5ZXIuZHJhdygpO1xufVxuZnVuY3Rpb24gdG9nZ2xlMkQzRCgpIHtcbiAgYXBwT3B0aW9ucy5pc0RyYXdpbmdJbjNEID0gIWFwcE9wdGlvbnMuaXNEcmF3aW5nSW4zRDtcbn1cbmZ1bmN0aW9uIHRvZ2dsZU1vdmluZ1N0cnVjdHVyZXMoKSB7XG4gIGFwcE9wdGlvbnMuaXNNb3ZpbmdTdHJ1Y3R1cmVzID0gIWFwcE9wdGlvbnMuaXNNb3ZpbmdTdHJ1Y3R1cmVzO1xufVxuZnVuY3Rpb24gdG9nZ2xlUm90YXRpbmdTdHJ1Y3R1cmVzKCkge1xuICBhcHBPcHRpb25zLmlzUm90YXRpbmdTdHJ1Y3R1cmVzID0gIWFwcE9wdGlvbnMuaXNSb3RhdGluZ1N0cnVjdHVyZXM7XG59XG5mdW5jdGlvbiBtb3VzZVByZXNzZWQoKSB7XG4gIHRvZ2dsZU1vdmluZ1N0cnVjdHVyZXMoKTtcbn1cbmZ1bmN0aW9uIGtleVByZXNzZWQoKSB7XG4gIGlmIChrZXkgPT0gXCIzXCIpIHtcbiAgICB0b2dnbGUyRDNEKCk7XG4gIH1cbiAgaWYgKGtleSA9PSBcInJcIikge1xuICAgIHRvZ2dsZVJvdGF0aW5nU3RydWN0dXJlcygpO1xuICB9XG4gIGlmIChrZXkgPT0gXCJvXCIpIHtcbiAgICByYW5kb21pc2VSZW5kZXJpbmdPcHRpb25zKCk7XG4gIH1cbn1cbiIsImNsYXNzIEFnZW50IHtcbiAgcG9zOiBwNS5WZWN0b3I7XG4gIG1vdmVtZW50UGhhc2U6IG51bWJlcjtcbiAgcmF5OiBSYXk7XG5cbiAgY29uc3RydWN0b3IocG9zOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLnBvcyA9IHBvcy5jb3B5KCk7XG4gICAgdGhpcy5tb3ZlbWVudFBoYXNlID0gcmFuZG9tKDEwMDAwKTtcbiAgICB0aGlzLnJheSA9IG5ldyBSYXkodGhpcy5wb3MsIHsgdGFyZ2V0OiBtb3VzZVBvc0FzVmVjdG9yKCkgfSk7XG4gIH1cblxuICBkcmF3KCkge1xuICAgIGNvbnN0IHRhcmdldFBvcyA9IG1vdXNlUG9zQXNWZWN0b3IoKTtcbiAgICBjb25zdCBvID0gdGhpcy5wb3M7XG4gICAgLy9kcmF3IGFnZW50IHNwcml0ZSAoYSBjaXJjbGUpIGFjY29yZGluZyB0byB3aGV0aGVyIGl0IGhhcyBsLm8ucy4gdG8gdGFyZ2V0UG9zXG4gICAgbm9TdHJva2UoKTtcbiAgICBwdXNoKCk7XG4gICAgdHJhbnNsYXRlKG8ueCwgby55KTtcbiAgICBzY2FsZSgyKTtcbiAgICBsZXQgYnJpZ2h0bmVzcztcbiAgICBpZiAoIXRoaXMucmF5LmNhblNlZVBvaW50KHRhcmdldFBvcykpIHtcbiAgICAgIGJyaWdodG5lc3MgPSAyMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlzdFRvVGFyZ2V0ID0gdGhpcy5wb3MuZGlzdCh0YXJnZXRQb3MpO1xuICAgICAgYnJpZ2h0bmVzcyA9IG1hcChkaXN0VG9UYXJnZXQsIDAsIG1heCh3aWR0aCwgaGVpZ2h0KSwgMjU1LCAwKTtcbiAgICB9XG4gICAgY29sb3JNb2RlKFJHQik7XG4gICAgY29uc3QgbGl0Q29sb3I6IHA1LkNvbG9yID0gY29sb3IoMjI0LCAyMjgsIDIwNCwgYnJpZ2h0bmVzcyk7XG4gICAgZmlsbChsaXRDb2xvcik7XG4gICAgY2lyY2xlKDAsIDAsIDgpO1xuICAgIGZpbGwoMCwgMCwgMCwgNDApO1xuICAgIHJlY3RNb2RlKENFTlRFUik7XG4gICAgcmVjdCgwLCAzLCA1LCAyKTtcbiAgICAvL2V5ZXNcbiAgICBjaXJjbGUoLTIsIC0xLCAxKTtcbiAgICBjaXJjbGUoMiwgLTEsIDEpO1xuXG4gICAgcG9wKCk7XG4gIH1cblxuICBzZXRQb3NpdGlvbihwb3M6IHA1LlZlY3Rvcikge1xuICAgIHRoaXMucG9zLnggPSBwb3MueDtcbiAgICB0aGlzLnBvcy55ID0gcG9zLnk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmFuZG9tKCkge1xuICAgIHJldHVybiBuZXcgQWdlbnQocmFuZG9tU2NyZWVuUG9zaXRpb24oKSk7XG4gIH1cbiAgLyoqIG1vdmUgdGhlIGFnZW50IGFuZCByZWNhbGN1bGF0ZSB0aGUgcmF5IGZyb20gaXQgdG8gdGhlIHRhcmdldCBwb3MgKi9cbiAgdXBkYXRlKHdhbGxzOiBXYWxsW10sIHRhcmdldFBvczogcDUuVmVjdG9yKTogdm9pZCB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gY3JlYXRlVmVjdG9yKDAsIDApO1xuICAgIG9mZnNldC54ID0gbWFwKFxuICAgICAgbm9pc2UodGhpcy5tb3ZlbWVudFBoYXNlICsgMzMzMzMgKyBmcmFtZUNvdW50IC8gMTAwKSxcbiAgICAgIDAsXG4gICAgICAxLFxuICAgICAgLTEsXG4gICAgICAxXG4gICAgKTtcbiAgICBvZmZzZXQueSA9IG1hcChub2lzZSh0aGlzLm1vdmVtZW50UGhhc2UgKyBmcmFtZUNvdW50IC8gMTAwKSwgMCwgMSwgLTEsIDEpO1xuXG4gICAgdGhpcy5zZXRQb3NpdGlvbih0aGlzLnBvcy5jb3B5KCkuYWRkKG9mZnNldCkpO1xuXG4gICAgdGhpcy5yYXkgPSBuZXcgUmF5KHRoaXMucG9zLCB7IHRhcmdldDogdGFyZ2V0UG9zLCB3YWxsczogd2FsbHMgfSk7XG4gIH1cbn1cbiIsIi8vVE9ETzogbmFtZXNwYWNlIHRoaXNcbmludGVyZmFjZSBEaXN0YW50UG9pbnQge1xuICBkaXN0YW5jZTogbnVtYmVyO1xuICBjb2xvcjogcDUuQ29sb3I7XG59XG5pbnRlcmZhY2UgRGlzdGFuY2VzQnVmZmVyIHtcbiAgdmFsdWVzOiBEaXN0YW50UG9pbnRbXTtcbn1cbmZ1bmN0aW9uIG1ha2VEaXN0YW5jZXNCdWZmZXIocmF5czogUmF5W10pOiBEaXN0YW5jZXNCdWZmZXIge1xuICByZXR1cm4gZ2VuZXJhdGVEYXRhRnJvbVJheXMocmF5cyk7XG59XG5mdW5jdGlvbiBjb2xvckZvclBvaW50KFxuICB7IGNvbG9yOiBjLCBwdCB9OiBJbnRlcnNlY3Rpb25Qb2ludCxcbiAgb3JpZ2luOiBwNS5WZWN0b3Jcbik6IHA1LkNvbG9yIHtcbiAgY29uc3QgZGlzdCA9IG9yaWdpbi5kaXN0KHB0KTtcbiAgY29uc3QgbGlnaHRuZXNzID0gbWFwKGRpc3QsIDAsIHdpZHRoLCA1MCwgMyk7XG4gIGNvbG9yTW9kZShSR0IpO1xuICBjb25zdCBbaCwgc10gPSBbaHVlKGMpLCBzYXR1cmF0aW9uKGMpXTtcbiAgY29sb3JNb2RlKEhTTCwgMTAwKTtcbiAgcmV0dXJuIGNvbG9yKGgsIHMsIGxpZ2h0bmVzcyk7XG59XG5mdW5jdGlvbiBnZW5lcmF0ZURhdGFGcm9tUmF5cyhyYXlzOiBSYXlbXSk6IERpc3RhbmNlc0J1ZmZlciB7XG4gIHJldHVybiB7XG4gICAgdmFsdWVzOiByYXlzLm1hcChyYXkgPT4ge1xuICAgICAgY29uc3QgbmVhcmVzdCA9IHJheS5uZWFyZXN0SW50ZXJzZWN0aW9uKCk7XG4gICAgICByZXR1cm4gbmVhcmVzdFxuICAgICAgICA/IHtcbiAgICAgICAgICAgIGRpc3RhbmNlOiBuZWFyZXN0LnB0LmRpc3QocmF5Lm9yaWdpbiksXG4gICAgICAgICAgICBjb2xvcjogY29sb3JGb3JQb2ludChuZWFyZXN0LCByYXkub3JpZ2luKVxuICAgICAgICAgIH1cbiAgICAgICAgOiB7IGRpc3RhbmNlOiB3aWR0aCAqIDEuNSwgY29sb3I6IGNvbG9yKFwiYmxhY2tcIikgfTtcbiAgICB9KVxuICB9O1xufVxuXG5mdW5jdGlvbiBkcmF3RGlzdGFuY2VzQnVmZmVyKGRpc3RhbnRQb2ludHM6IERpc3RhbmNlc0J1ZmZlcikge1xuICBjb25zdCBudW1TdHJpcHMgPSBkaXN0YW50UG9pbnRzLnZhbHVlcy5sZW5ndGg7XG4gIGNvbnN0IHN0cmlwV2lkdGggPSByb3VuZCh3aWR0aCAvIG51bVN0cmlwcyk7XG4gIGRpc3RhbnRQb2ludHMudmFsdWVzLmZvckVhY2goKHsgZGlzdGFuY2UsIGNvbG9yIH0sIGl4KSA9PiB7XG4gICAgY29uc3QgeCA9IGl4ICogc3RyaXBXaWR0aDtcbiAgICBjb25zdCB5ID0gbWFwKGRpc3RhbmNlLCAwLCB3aWR0aCwgaGVpZ2h0ICogMC43LCAwKTtcbiAgICBub1N0cm9rZSgpO1xuICAgIGZpbGwoY29sb3IpO1xuICAgIHJlY3RNb2RlKENFTlRFUik7XG4gICAgcmVjdCh4LCBoZWlnaHQgLyAyLCBzdHJpcFdpZHRoLCB5KTtcbiAgfSk7XG59XG4iLCJjbGFzcyBQYWxldHRlIHtcbiAgc3RhdGljIGdldENvbG9ycygpIHtcbiAgICByZXR1cm4gW1xuICAgICAgY29sb3IoMjUwLCAxMDUsIDApLFxuICAgICAgY29sb3IoMTA1LCAyMTAsIDIzMSksXG4gICAgICBjb2xvcigxNjcsIDIxOSwgMjE2KSxcbiAgICAgIGNvbG9yKDI0MywgMTM0LCA0OClcbiAgICBdO1xuICB9XG4gIHN0YXRpYyByYW5kb21Db2xvcigpOiBwNS5Db2xvciB7XG4gICAgcmV0dXJuIHJhbmRvbShQYWxldHRlLmdldENvbG9ycygpKTtcbiAgfVxufVxuIiwiY2xhc3MgUGFydGljbGUge1xuICBwb3M6IHA1LlZlY3RvcjtcbiAgaGVhZGluZzogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHBvczogcDUuVmVjdG9yKSB7XG4gICAgdGhpcy5wb3MgPSBwb3MuY29weSgpO1xuICAgIHRoaXMuaGVhZGluZyA9IDA7XG4gIH1cbiAgZHJhdygpIHtcbiAgICBub1N0cm9rZSgpO1xuICAgIGZpbGwoXCJibGFja1wiKTtcbiAgICByZWN0TW9kZShDRU5URVIpO1xuICAgIHNxdWFyZSh0aGlzLnBvcy54LCB0aGlzLnBvcy55LCAzKTtcbiAgICBmaWxsKDAsIDIwKTtcbiAgfVxuICB1cGRhdGUoKSB7XG4gICAgY29uc3QgbW91c2VNb3ZlbWVudEFuZ2xlID0gYW5nbGVPZkxhc3RNb3VzZU1vdmVtZW50KCk7XG4gICAgaWYgKG1vdXNlTW92ZW1lbnRBbmdsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmhlYWRpbmcgPSBtb3VzZU1vdmVtZW50QW5nbGU7XG4gICAgfVxuICB9XG5cbiAgc2V0UG9zaXRpb24ocG9zOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLnBvcy54ID0gcG9zLng7XG4gICAgdGhpcy5wb3MueSA9IHBvcy55O1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpIHtcbiAgICByZXR1cm4gbmV3IFBhcnRpY2xlKHJhbmRvbVNjcmVlblBvc2l0aW9uKCkpO1xuICB9XG59XG4iLCJpbnRlcmZhY2UgUmVuZGVyaW5nT3B0aW9ucyB7XG4gIGRyYXdBc0NvYndlYjogYm9vbGVhbjtcbiAgZHJhd0dob3N0UmF5OiBib29sZWFuO1xuICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogYm9vbGVhbjtcbiAgZHJhd0FsbEludGVyc2VjdGlvbnM6IGJvb2xlYW47XG4gIGRyYXdGaXJzdEludGVyc2VjdGlvbjogYm9vbGVhbjtcbn1cbmNvbnN0IGRlZmF1bHRSZW5kZXJpbmdPcHRpb25zOiBSZW5kZXJpbmdPcHRpb25zID0ge1xuICBkcmF3QXNDb2J3ZWI6IGZhbHNlLFxuICBkcmF3R2hvc3RSYXk6IGZhbHNlLFxuICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogdHJ1ZSxcbiAgZHJhd0FsbEludGVyc2VjdGlvbnM6IGZhbHNlLFxuICBkcmF3Rmlyc3RJbnRlcnNlY3Rpb246IHRydWVcbn07XG5sZXQgcmVuZGVyaW5nT3B0aW9uczogUmVuZGVyaW5nT3B0aW9ucyA9IHJhbmRvbVJlbmRlcmluZ09wdGlvbnMoKTtcblxuZnVuY3Rpb24gcmFuZG9taXNlUmVuZGVyaW5nT3B0aW9ucygpIHtcbiAgcmVuZGVyaW5nT3B0aW9ucyA9IHJhbmRvbVJlbmRlcmluZ09wdGlvbnMoKTtcbn1cblxuZnVuY3Rpb24gcmFuZG9tUmVuZGVyaW5nT3B0aW9ucygpIHtcbiAgcmV0dXJuIHtcbiAgICBkcmF3QXNDb2J3ZWI6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBkcmF3R2hvc3RSYXk6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogcmFuZG9tQm9vbGVhbigpLFxuICAgIGRyYXdBbGxJbnRlcnNlY3Rpb25zOiByYW5kb21Cb29sZWFuKCksXG4gICAgZHJhd0ZpcnN0SW50ZXJzZWN0aW9uOiByYW5kb21Cb29sZWFuKClcbiAgfTtcbn1cbmludGVyZmFjZSBJbnRlcnNlY3Rpb25Qb2ludCB7XG4gIHB0OiBwNS5WZWN0b3I7XG4gIGNvbG9yOiBwNS5Db2xvcjtcbn1cblxuaW50ZXJmYWNlIFJheU9wdGlvbnMge1xuICBhbmdsZVJhZHM/OiBudW1iZXI7XG4gIHRhcmdldD86IHA1LlZlY3RvcjsgLy9UT0RPOiBleGFjdGx5IG9uZSBvZiB0YXJnZXQgYW5kIGFuZ2xlUmFkcyBpcyByZXF1aXJlZC5cbiAgd2FsbHM/OiBXYWxsW107XG59XG5cbmNsYXNzIFJheSB7XG4gIC8vVE9ETzogc3BsaXQgdGhpcyBvdXQgaW50byBhbiBhZ2VudCB3aGljaCBoYXMgYW4gb3JpZ2luIGFuZCBhIHJheSwgd2l0aCB0aGUgcmF5IGhhbmRsaW5nIG9ubHkgaGFuZGxpbmcgZGVjaWRpbmcgbGluZSBvZiBzaWdodCBhbmQgaW50ZXJzZWN0aW9uIHBvaW50cy5cblxuICBvcmlnaW46IHA1LlZlY3RvcjtcblxuICAvL3JheSBpcyBjb25jZXB0dWFsbHkgaW5maW5pdGUgbGVuZ3RoIHdpdGggb25seSBvbmUgZW5kLCBidXQgdGhpcyBoYWNrIGlzIHVzZWZ1bCBmb3IgaW50ZXJzZWN0aW9uIGFuZCByZW5kZXJpbmcuXG4gIGZhckVuZDogcDUuVmVjdG9yOyAvL2EgaGFjay4gIG9mZnNjcmVlbiBcImZhciBlbmRcIi5cblxuICBhbmdsZVJhZHM6IHA1LlZlY3RvcjtcbiAgaW50ZXJzZWN0aW9uUG9pbnRzOiBJbnRlcnNlY3Rpb25Qb2ludFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIG9yaWdpbjogcDUuVmVjdG9yLFxuICAgIHsgYW5nbGVSYWRzID0gbnVsbCwgdGFyZ2V0ID0gbnVsbCwgd2FsbHMgPSBbXSB9OiBSYXlPcHRpb25zXG4gICkge1xuICAgIHRoaXMub3JpZ2luID0gb3JpZ2luLmNvcHkoKTtcbiAgICBpZiAodGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmxvb2tBdCh0YXJnZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFuZ2xlUmFkcyA9IHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGVSYWRzKTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMgPSBbXTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlRmFyRW5kKCk7XG4gICAgaWYgKHdhbGxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucmVjYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzKTtcbiAgICB9XG4gIH1cblxuICBsb29rQXQodGFyZ2V0UG9zOiBwNS5WZWN0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBkZWx0YVRvVGFyZ2V0ID0gdGFyZ2V0UG9zLmNvcHkoKS5zdWIodGhpcy5vcmlnaW4pO1xuICAgIC8vbm90ZTogcGFyYW0gb3JkZXI6IHkgdGhlbiB4XG4gICAgY29uc3QgYW5nbGVUb1RhcmdldCA9IGF0YW4yKGRlbHRhVG9UYXJnZXQueSwgZGVsdGFUb1RhcmdldC54KTtcbiAgICB0aGlzLmFuZ2xlUmFkcyA9IHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGVUb1RhcmdldCk7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUZhckVuZCgpO1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpOiBSYXkge1xuICAgIHJldHVybiBuZXcgUmF5KHJhbmRvbVNjcmVlblBvc2l0aW9uKCksIHsgYW5nbGVSYWRzOiByYW5kb20oMCwgVFdPX1BJKSB9KTtcbiAgfVxuICBpbnRlcnNlY3Rpb25XaXRoV2FsbCh3YWxsOiBXYWxsKTogcDUuVmVjdG9yIHtcbiAgICAvL1RPRE86IGN1c3RvbWlzZSBhIGZuIHRvIGNvbGxpZGVMaW5lU2VnV2l0aFJheSxcbiAgICAvL3JhdGhlciB0aGFuIExpbmVTZWcgd2l0aCBMaW5lU2VnXG4gICAgY29uc3QgYW5zd2VyID0gY29sbGlkZUxpbmVMaW5lKFxuICAgICAgd2FsbC5hLngsXG4gICAgICB3YWxsLmEueSxcbiAgICAgIHdhbGwuYi54LFxuICAgICAgd2FsbC5iLnksXG4gICAgICB0aGlzLm9yaWdpbi54LFxuICAgICAgdGhpcy5vcmlnaW4ueSxcbiAgICAgIHRoaXMuZmFyRW5kLngsXG4gICAgICB0aGlzLmZhckVuZC55XG4gICAgKTtcblxuICAgIHJldHVybiBhbnN3ZXI7XG4gIH1cblxuICBuZWFyZXN0SW50ZXJzZWN0aW9uKCk6IEludGVyc2VjdGlvblBvaW50IHtcbiAgICBpZiAodGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG1pbkJ5KFxuICAgICAgICB0aGlzLmludGVyc2VjdGlvblBvaW50cyxcbiAgICAgICAgKHsgcHQsIGNvbG9yIH06IEludGVyc2VjdGlvblBvaW50KSA9PiAtdGhpcy5vcmlnaW4uZGlzdChwdClcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIGNhbGN1bGF0ZUludGVyc2VjdGlvbnMod2FsbHM6IFdhbGxbXSk6IEludGVyc2VjdGlvblBvaW50W10ge1xuICAgIGNvbnN0IHJlczogSW50ZXJzZWN0aW9uUG9pbnRbXSA9IFtdO1xuICAgIGZvciAobGV0IHdhbGwgb2Ygd2FsbHMpIHtcbiAgICAgIGNvbnN0IGludGVyc2VjdGlvbiA9IHRoaXMuaW50ZXJzZWN0aW9uV2l0aFdhbGwod2FsbCk7XG4gICAgICBpZiAoaW50ZXJzZWN0aW9uKSB7XG4gICAgICAgIHJlcy5wdXNoKHsgcHQ6IGludGVyc2VjdGlvbiwgY29sb3I6IHdhbGwubXlDb2xvciB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICByZWNhbGN1bGF0ZUludGVyc2VjdGlvbnMod2FsbHM6IFdhbGxbXSk6IHZvaWQge1xuICAgIHRoaXMuaW50ZXJzZWN0aW9uUG9pbnRzID0gdGhpcy5jYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzKTtcbiAgfVxuXG4gIHJlY2FsY3VsYXRlRmFyRW5kKCk6IHZvaWQge1xuICAgIHRoaXMuZmFyRW5kID0gdGhpcy5vcmlnaW4uY29weSgpLmFkZCh0aGlzLmFuZ2xlUmFkcy5jb3B5KCkubXVsdCh3aWR0aCkpO1xuICB9XG5cbiAgZHJhd0xpdExpbmVTZWdtZW50KGE6IHA1LlZlY3RvciwgYjogcDUuVmVjdG9yKTogdm9pZCB7XG4gICAgc3Ryb2tlKFwid2hpdGVcIik7XG4gICAgaWYgKHJlbmRlcmluZ09wdGlvbnMuZHJhd0FzQ29id2ViKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDIwOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHQgPSBhLmNvcHkoKS5sZXJwKGIsIGkgLyAxMCk7XG4gICAgICAgIHNxdWFyZShwdC54LCBwdC55LCAxKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGluZShhLngsIGEueSwgYi54LCBiLnkpO1xuICAgIH1cbiAgfVxuXG4gIGRyYXdSYXlVbnRpbEZpcnN0SW50ZXJzZWN0aW9uKCk6IHZvaWQge1xuICAgIGNvbnN0IG8gPSB0aGlzLm9yaWdpbjtcbiAgICBjb25zdCBlbmQgPSBvLmNvcHkoKS5hZGQodGhpcy5hbmdsZVJhZHMuY29weSgpLm11bHQoNDApKTtcblxuICAgIC8vZHJhdyB0byBmYXIgKG9mZi1zY3JlZW4pIGVuZFxuICAgIGlmIChyZW5kZXJpbmdPcHRpb25zLmRyYXdHaG9zdFJheSkge1xuICAgICAgc3Ryb2tlKDI1NSwgMjU1LCAyNTUsIDEwKTtcbiAgICAgIHN0cm9rZVdlaWdodCgwLjMpO1xuICAgICAgbGluZShvLngsIG8ueSwgdGhpcy5mYXJFbmQueCwgdGhpcy5mYXJFbmQueSk7XG4gICAgfVxuICAgIGNvbnN0IHsgcHQsIGNvbG9yIH0gPSB0aGlzLm5lYXJlc3RJbnRlcnNlY3Rpb24oKTtcbiAgICBpZiAocmVuZGVyaW5nT3B0aW9ucy5kcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbikge1xuICAgICAgaWYgKHB0KSB7XG4gICAgICAgIHN0cm9rZShjb2xvcik7XG4gICAgICAgIHN0cm9rZVdlaWdodCgyKTtcbiAgICAgICAgdGhpcy5kcmF3TGl0TGluZVNlZ21lbnQobywgcHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZW5kZXJpbmdPcHRpb25zLmRyYXdBbGxJbnRlcnNlY3Rpb25zKSB7XG4gICAgICBmb3IgKGxldCB7IHB0LCBjb2xvciB9IG9mIHRoaXMuaW50ZXJzZWN0aW9uUG9pbnRzKSB7XG4gICAgICAgIGZpbGwoXCJ3aGl0ZVwiKTtcbiAgICAgICAgY2lyY2xlKHB0LngsIHB0LnksIDIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZW5kZXJpbmdPcHRpb25zLmRyYXdGaXJzdEludGVyc2VjdGlvbikge1xuICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLm5lYXJlc3RJbnRlcnNlY3Rpb24oKTtcbiAgICAgIGlmIChmaXJzdCkge1xuICAgICAgICBub1N0cm9rZSgpO1xuICAgICAgICBmaWxsKGZpcnN0LmNvbG9yKTtcbiAgICAgICAgY2lyY2xlKGZpcnN0LnB0LngsIGZpcnN0LnB0LnksIDYpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjYW5TZWVQb2ludCh0YXJnZXQ6IHA1LlZlY3Rvcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IG5lYXJlc3RJc2VjdDogSW50ZXJzZWN0aW9uUG9pbnQgPSB0aGlzLm5lYXJlc3RJbnRlcnNlY3Rpb24oKTtcbiAgICBjb25zdCBkaXN0VG9UYXJnZXQgPSB0aGlzLm9yaWdpbi5kaXN0KHRhcmdldCk7XG4gICAgcmV0dXJuICEobmVhcmVzdElzZWN0ICYmIHRoaXMub3JpZ2luLmRpc3QobmVhcmVzdElzZWN0LnB0KSA8IGRpc3RUb1RhcmdldCk7XG4gIH1cbn1cbiIsImNsYXNzIFN0cnVjdHVyZSB7XG4gIGlzRmlsbGVkU2hhcGUgPSBmYWxzZTtcbiAgY2VudGVyOiBwNS5WZWN0b3I7XG4gIGFic3RyYWN0VmVydGljZXM6IHA1LlZlY3RvcltdO1xuICB3YWxsczogV2FsbFtdO1xuICBtb3ZlbWVudFNwZWVkOiBudW1iZXI7XG4gIG15Q29sb3I6IHA1LkNvbG9yO1xuICByb3RhdGlvbjogbnVtYmVyO1xuICByb3RhdGlvblNwZWVkOiBudW1iZXI7XG4gIHNob3VsZFJvdGF0ZTogYm9vbGVhbjtcbiAgY29uc3RydWN0b3IoY2VudGVyOiBwNS5WZWN0b3IsIHJhZGl1czogbnVtYmVyLCBudW1TaWRlczogbnVtYmVyKSB7XG4gICAgdGhpcy5zaG91bGRSb3RhdGUgPSBmYWxzZTtcbiAgICB0aGlzLnJvdGF0aW9uID0gcmFuZG9tKFRXT19QSSk7XG4gICAgdGhpcy5teUNvbG9yID0gUGFsZXR0ZS5yYW5kb21Db2xvcigpO1xuICAgIHRoaXMubW92ZW1lbnRTcGVlZCA9IC1yYW5kb20oMC4yLCAyKTtcbiAgICB0aGlzLnJvdGF0aW9uU3BlZWQgPSByYW5kb20oLTAuMDEsIDAuMDEpO1xuICAgIHRoaXMuYWJzdHJhY3RWZXJ0aWNlcyA9IHRoaXMuY3JlYXRlVmVydGljZXNGb3JTaGFwZVdpdGhOdW1TaWRlcyhcbiAgICAgIGNlbnRlcixcbiAgICAgIHJhZGl1cyxcbiAgICAgIG51bVNpZGVzXG4gICAgKTtcblxuICAgIHRoaXMud2FsbHMgPSB0aGlzLm1ha2VXYWxsc0Zyb21WZXJ0aWNlcyhcbiAgICAgIHRoaXMuYWJzdHJhY3RWZXJ0aWNlcyxcbiAgICAgIHRoaXMubXlDb2xvclxuICAgICk7XG4gIH1cblxuICBjcmVhdGVWZXJ0aWNlc0ZvclNoYXBlV2l0aE51bVNpZGVzKFxuICAgIGNlbnRlcjogcDUuVmVjdG9yLFxuICAgIHJhZGl1czogbnVtYmVyLFxuICAgIG51bVNpZGVzOiBudW1iZXJcbiAgKTogcDUuVmVjdG9yW10ge1xuICAgIGNvbnN0IHZlcnRpY2VzID0gW107XG4gICAgLy9zcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSB3YWxsXG4gICAgaWYgKG51bVNpZGVzID09PSAxKSB7XG4gICAgICBsZXQgW2EsIGJdID0gdGhpcy5jcmVhdGVSYW5kb21MaW5lU2VnKCk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKGEpO1xuICAgICAgdmVydGljZXMucHVzaChiKTtcbiAgICAgIHRoaXMuY2VudGVyID0gYS5jb3B5KCkubGVycChiLCAwLjUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNlbnRlciA9IGNlbnRlci5jb3B5KCk7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU2lkZXM7IGkrKykge1xuICAgICAgICBjb25zdCBhbmdsZSA9IChpICogVFdPX1BJKSAvIG51bVNpZGVzO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoKFxuICAgICAgICAgIHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGUpXG4gICAgICAgICAgICAubXVsdChyYWRpdXMpXG4gICAgICAgICAgICAuYWRkKHRoaXMuY2VudGVyKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmVydGljZXM7XG4gIH1cbiAgbWFrZVdhbGxzRnJvbVZlcnRpY2VzKHZzOiBwNS5WZWN0b3JbXSwgbXlDb2xvcjogcDUuQ29sb3IpOiBXYWxsW10ge1xuICAgIGNvbnN0IHdhbGxzOiBXYWxsW10gPSBbXTtcbiAgICBpZiAodnMubGVuZ3RoID09PSAyKSB7XG4gICAgICBjb25zdCBzaW5nbGVXYWxsID0gbmV3IFdhbGwodnNbMF0sIHZzWzFdKTtcbiAgICAgIHNpbmdsZVdhbGwubXlDb2xvciA9IG15Q29sb3I7XG4gICAgICB3YWxscy5wdXNoKHNpbmdsZVdhbGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBudW1TaWRlcyA9IHZzLmxlbmd0aDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU2lkZXM7IGkrKykge1xuICAgICAgICBjb25zdCBhID0gdnNbaV07XG4gICAgICAgIGNvbnN0IGIgPSBpID09PSBudW1TaWRlcyAtIDEgPyB2c1swXSA6IHZzW2kgKyAxXTtcbiAgICAgICAgY29uc3Qgd2FsbCA9IG5ldyBXYWxsKGEsIGIpO1xuICAgICAgICB3YWxsLm15Q29sb3IgPSBteUNvbG9yO1xuICAgICAgICB3YWxscy5wdXNoKHdhbGwpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gd2FsbHM7XG4gIH1cbiAgY3JlYXRlUmFuZG9tTGluZVNlZygpOiBwNS5WZWN0b3JbXSB7XG4gICAgY29uc3QgcDEgPSByYW5kb21TY3JlZW5Qb3NpdGlvbigpO1xuICAgIGNvbnN0IHAyID0gcDEuY29weSgpLmFkZChwNS5WZWN0b3IucmFuZG9tMkQoKS5tdWx0KHJhbmRvbSg0MCwgNDAwKSkpO1xuICAgIHJldHVybiBbcDEsIHAyXTtcbiAgfVxuXG4gIHJvdGF0ZShhbmdsZVJhZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5yb3RhdGlvbiArPSBhbmdsZVJhZDtcbiAgICBjb25zdCByb3RhdGVkVmVydGljZXMgPSB0aGlzLmFic3RyYWN0VmVydGljZXMubWFwKHYgPT5cbiAgICAgIHJvdGF0ZVZlcnRleEFyb3VuZCh2LCB0aGlzLmNlbnRlciwgdGhpcy5yb3RhdGlvbilcbiAgICApO1xuXG4gICAgLy9yZW1ha2UgdGhlIHdhbGxzXG4gICAgdGhpcy53YWxscyA9IHRoaXMubWFrZVdhbGxzRnJvbVZlcnRpY2VzKHJvdGF0ZWRWZXJ0aWNlcywgdGhpcy5teUNvbG9yKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgbW92ZUFtdDogbnVtYmVyID0gdGhpcy5tb3ZlbWVudFNwZWVkO1xuICAgIGlmICh0aGlzLmNlbnRlci54ICsgbW92ZUFtdCA8IDApIHtcbiAgICAgIG1vdmVBbXQgKz0gd2lkdGg7XG4gICAgfVxuICAgIHRoaXMuY2VudGVyLnggKz0gbW92ZUFtdDtcbiAgICAvL3JlbWFrZSB0aGUgd2FsbHNcbiAgICB0aGlzLndhbGxzID0gdGhpcy5tYWtlV2FsbHNGcm9tVmVydGljZXMoXG4gICAgICB0aGlzLmFic3RyYWN0VmVydGljZXMubWFwKHYgPT4gdi5hZGQoY3JlYXRlVmVjdG9yKG1vdmVBbXQsIDApKSksXG4gICAgICB0aGlzLm15Q29sb3JcbiAgICApO1xuICAgIGlmICh0aGlzLnNob3VsZFJvdGF0ZSkge1xuICAgICAgdGhpcy5yb3RhdGUodGhpcy5yb3RhdGlvblNwZWVkKTtcbiAgICB9XG4gIH1cbiAgZHJhdygpIHtcbiAgICBmb3IgKGxldCB3YWxsIG9mIHRoaXMud2FsbHMpIHtcbiAgICAgIHdhbGwuZHJhdygpO1xuICAgIH1cbiAgICAvL2NpcmNsZSh0aGlzLmNlbnRlci54LCB0aGlzLmNlbnRlci55LCA1KTtcbiAgICBpZiAodGhpcy5pc0ZpbGxlZFNoYXBlKSB7XG4gICAgICBiZWdpblNoYXBlKCk7XG4gICAgICBmb3IgKGxldCB3YWxsIG9mIHRoaXMud2FsbHMpIHtcbiAgICAgICAgZm9yIChsZXQgcHQgb2YgW3dhbGwuYSwgd2FsbC5iXSkge1xuICAgICAgICAgIHZlcnRleChwdC54LCBwdC55KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZW5kU2hhcGUoQ0xPU0UpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSYW5kb20oKSB7XG4gICAgY29uc3QgY2VudGVyID0gcmFuZG9tU2NyZWVuUG9zaXRpb24oKTtcbiAgICBjb25zdCBudW1TaWRlcyA9IHJhbmRvbShbMSwgMSwgMSwgMywgNCwgNSwgNl0pO1xuICAgIHJldHVybiBuZXcgU3RydWN0dXJlKGNlbnRlciwgcmFuZG9tKDIwLCByYW5kb20oMTAwLCAyMDApKSwgbnVtU2lkZXMpO1xuICB9XG59XG4iLCJmdW5jdGlvbiByZXBlYXQobnVtOiBudW1iZXIsIGZuOiAoaXg6IG51bWJlcikgPT4gdm9pZCkge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bTsgaSsrKSB7XG4gICAgZm4oaSk7XG4gIH1cbn1cbmZ1bmN0aW9uIHJhbmRvbVNjcmVlblBvc2l0aW9uKCk6IHA1LlZlY3RvciB7XG4gIHJldHVybiBjcmVhdGVWZWN0b3IocmFuZG9tKHdpZHRoKSwgcmFuZG9tKGhlaWdodCkpO1xufVxuXG5mdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIHJvdW5kKHJhbmRvbShtaW4sIG1heCkpO1xufVxuXG5mdW5jdGlvbiB0cmFuc2xhdGVUb1ZlYyhwb3M6IHA1LlZlY3Rvcik6IHZvaWQge1xuICB0cmFuc2xhdGUocG9zLngsIHBvcy55KTtcbn1cblxuZnVuY3Rpb24gY2VudGVyUG9zKCk6IHA1LlZlY3RvciB7XG4gIHJldHVybiBjcmVhdGVWZWN0b3Iod2lkdGggLyAyLCBoZWlnaHQgLyAyKTtcbn1cbmZ1bmN0aW9uIHJvdGF0ZVZlcnRleEFyb3VuZChcbiAgdmVydGV4OiBwNS5WZWN0b3IsXG4gIHJvdE9yaWdpbjogcDUuVmVjdG9yLFxuICBhbmdsZVJhZDogbnVtYmVyXG4pOiBwNS5WZWN0b3Ige1xuICByZXR1cm4gdmVydGV4XG4gICAgLmNvcHkoKVxuICAgIC5zdWIocm90T3JpZ2luKVxuICAgIC5yb3RhdGUoYW5nbGVSYWQpXG4gICAgLmFkZChyb3RPcmlnaW4pO1xufVxuXG4vL1Rha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jtb3Jlbi9wNS5jb2xsaWRlMkRcbmZ1bmN0aW9uIGNvbGxpZGVMaW5lTGluZShcbiAgeDE6IG51bWJlcixcbiAgeTE6IG51bWJlcixcbiAgeDI6IG51bWJlcixcbiAgeTI6IG51bWJlcixcbiAgeDM6IG51bWJlcixcbiAgeTM6IG51bWJlcixcbiAgeDQ6IG51bWJlcixcbiAgeTQ6IG51bWJlclxuKSB7XG4gIC8vIGNhbGN1bGF0ZSB0aGUgZGlzdGFuY2UgdG8gaW50ZXJzZWN0aW9uIHBvaW50XG4gIGxldCB1QSA9XG4gICAgKCh4NCAtIHgzKSAqICh5MSAtIHkzKSAtICh5NCAtIHkzKSAqICh4MSAtIHgzKSkgL1xuICAgICgoeTQgLSB5MykgKiAoeDIgLSB4MSkgLSAoeDQgLSB4MykgKiAoeTIgLSB5MSkpO1xuICBsZXQgdUIgPVxuICAgICgoeDIgLSB4MSkgKiAoeTEgLSB5MykgLSAoeTIgLSB5MSkgKiAoeDEgLSB4MykpIC9cbiAgICAoKHk0IC0geTMpICogKHgyIC0geDEpIC0gKHg0IC0geDMpICogKHkyIC0geTEpKTtcblxuICAvLyBpZiB1QSBhbmQgdUIgYXJlIGJldHdlZW4gMC0xLCBsaW5lcyBhcmUgY29sbGlkaW5nXG4gIGlmICh1QSA+PSAwICYmIHVBIDw9IDEgJiYgdUIgPj0gMCAmJiB1QiA8PSAxKSB7XG4gICAgLy8gY2FsYyB0aGUgcG9pbnQgd2hlcmUgdGhlIGxpbmVzIG1lZXRcbiAgICBsZXQgaW50ZXJzZWN0aW9uWCA9IHgxICsgdUEgKiAoeDIgLSB4MSk7XG4gICAgbGV0IGludGVyc2VjdGlvblkgPSB5MSArIHVBICogKHkyIC0geTEpO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVZlY3RvcihpbnRlcnNlY3Rpb25YLCBpbnRlcnNlY3Rpb25ZKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gbWluQnk8VD4obGlzdDogVFtdLCBmbjogKGl0ZW06IFQpID0+IG51bWJlcik6IFQge1xuICBpZiAobGlzdC5sZW5ndGggPCAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IHJlY29yZEl0ZW0gPSBsaXN0WzBdO1xuICBsZXQgcmVjb3JkV2VpZ2h0ID0gZm4obGlzdFswXSk7XG4gIGZvciAobGV0IGl0ZW0gb2YgbGlzdCkge1xuICAgIGNvbnN0IHdlaWdodCA9IGZuKGl0ZW0pO1xuICAgIGlmICh3ZWlnaHQgPiByZWNvcmRXZWlnaHQpIHtcbiAgICAgIHJlY29yZFdlaWdodCA9IHdlaWdodDtcbiAgICAgIHJlY29yZEl0ZW0gPSBpdGVtO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVjb3JkSXRlbTtcbn1cblxuZnVuY3Rpb24gZGlzdHJpYnV0ZVVwVG8odG90YWw6IG51bWJlciwgbWF4OiBudW1iZXIsIGZuOiAodjogbnVtYmVyKSA9PiB2b2lkKSB7XG4gIHJlcGVhdCh0b3RhbCwgaXggPT4ge1xuICAgIGNvbnN0IHZhbCA9IChpeCAqIG1heCkgLyB0b3RhbDtcbiAgICBmbih2YWwpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZGlzdHJpYnV0ZUJldHdlZW4oXG4gIG51bVNhbXBsZXM6IG51bWJlcixcbiAgbWluOiBudW1iZXIsXG4gIG1heDogbnVtYmVyLFxuICBmbjogKHY6IG51bWJlcikgPT4gdm9pZFxuKSB7XG4gIHJlcGVhdChudW1TYW1wbGVzLCBpeCA9PiB7XG4gICAgY29uc3QgcmFuZ2UgPSBtYXggLSBtaW47XG4gICAgY29uc3QgdmFsID0gbWluICsgKGl4ICogcmFuZ2UpIC8gbnVtU2FtcGxlcztcbiAgICBmbih2YWwpO1xuICB9KTtcbn1cbmZ1bmN0aW9uIGF2ZXJhZ2VWZWN0b3JzKHZzOiBwNS5WZWN0b3JbXSk6IHA1LlZlY3RvciB7XG4gIGlmICh2cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVZlY3RvcigwLCAwKTtcbiAgfVxuICByZXR1cm4gdnMucmVkdWNlKCh2MSwgdjIpID0+IHYxLmNvcHkoKS5hZGQodjIpLCB2c1swXSkuZGl2KHZzLmxlbmd0aCk7XG59XG5cbi8vVE9ETzogZG9uJ3QgcG9sbHV0ZSBnbG9iYWxcbmNvbnN0IGdMYXN0TW91c2VNb3ZlbWVudHM6IHA1LlZlY3RvcltdID0gW107XG5cbi8vVE9ETzogc21vb3RoIHRoaXMgb3V0IGJ5IGJ1ZmZlcmluZyBhIGZldyBtb3ZlbWVudHNcbi8vTWFpbnRhaW4gdGhlIHByZXZpb3VzIGFuZ2xlIGlmIHRoZXJlJ3MgYmVlbiBubyBtb3ZlbWVudFxuZnVuY3Rpb24gYW5nbGVPZkxhc3RNb3VzZU1vdmVtZW50KCk6IG51bWJlciB7XG4gIGNvbnN0IGRlbHRhID0gY3JlYXRlVmVjdG9yKG1vdXNlWCAtIHBtb3VzZVgsIG1vdXNlWSAtIHBtb3VzZVkpO1xuICBpZiAoZGVsdGEubWFnU3EoKSA8IDEpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIGdMYXN0TW91c2VNb3ZlbWVudHMudW5zaGlmdChkZWx0YSk7XG4gICAgZ0xhc3RNb3VzZU1vdmVtZW50cy5zcGxpY2UoOCk7XG4gICAgY29uc3QgYXZnTW92ZW1lbnQgPSBhdmVyYWdlVmVjdG9ycyhnTGFzdE1vdXNlTW92ZW1lbnRzKTtcblxuICAgIC8vYXZlcmFnZSBtaWdodCBoYXZlIGNhbmNlbGxlZCBvdXQgYW5kIHRoZXJlZm9yZSBoYXZlIG5vIGhlYWRpbmdcbiAgICBpZiAoYXZnTW92ZW1lbnQubWFnKCkgPiAwKSB7XG4gICAgICByZXR1cm4gYXZnTW92ZW1lbnQuaGVhZGluZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21Cb29sZWFuKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKSA+IDAuNTtcbn1cbiIsImNsYXNzIFdhbGwge1xuICBhOiBwNS5WZWN0b3I7XG4gIGI6IHA1LlZlY3RvcjtcblxuICBteUNvbG9yOiBwNS5Db2xvcjtcblxuICBjb25zdHJ1Y3RvcihhOiBwNS5WZWN0b3IsIGI6IHA1LlZlY3Rvcikge1xuICAgIHRoaXMuYSA9IGEuY29weSgpO1xuICAgIHRoaXMuYiA9IGIuY29weSgpO1xuICAgIHRoaXMubXlDb2xvciA9IGNvbG9yKDI0MywgMTM0LCA0OCk7XG4gIH1cbiAgZHJhdygpIHtcbiAgICBzdHJva2UodGhpcy5teUNvbG9yKTtcbiAgICBzdHJva2VXZWlnaHQoNCk7XG4gICAgbGluZSh0aGlzLmEueCwgdGhpcy5hLnksIHRoaXMuYi54LCB0aGlzLmIueSk7XG5cbiAgICBub1N0cm9rZSgpO1xuICAgIGZpbGwodGhpcy5teUNvbG9yKTtcbiAgICBbdGhpcy5hLCB0aGlzLmJdLmZvckVhY2gocHQgPT4ge1xuICAgICAgLy9jaXJjbGUocHQueCwgcHQueSwgNSk7XG4gICAgfSk7XG4gIH1cbiAgbWlkUG9pbnQoKTogcDUuVmVjdG9yIHtcbiAgICByZXR1cm4gdGhpcy5hLmNvcHkoKS5sZXJwKHRoaXMuYiwgMC41KTtcbiAgfVxuXG4gIGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiBkaXN0KHRoaXMuYS54LCB0aGlzLmEueSwgdGhpcy5iLngsIHRoaXMuYi55KTtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSYW5kb20oKSB7XG4gICAgY29uc3QgcDEgPSByYW5kb21TY3JlZW5Qb3NpdGlvbigpO1xuICAgIGNvbnN0IHAyID0gcDEuY29weSgpLmFkZChwNS5WZWN0b3IucmFuZG9tMkQoKS5tdWx0KHJhbmRvbSg0MCwgNDAwKSkpO1xuICAgIHJldHVybiBuZXcgV2FsbChwMSwgcDIpO1xuICB9XG59XG4iXX0=