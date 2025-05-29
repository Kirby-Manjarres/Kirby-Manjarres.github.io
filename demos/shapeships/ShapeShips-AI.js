let myPlayer;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let blackHoles = [];
let lives = 3;
let score = 0;
let gameOver = false;
let stars = [];
let shakeAmount = 0;
let scaleFactor;
let gameStartFrame;
let difficultyStage = 1;
let enemiesDestroyed = 0;
let lastKillTime = 0;
let enemyFactory;
let playerKeys = { up: false, down: false, left: false, right: false };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  scaleFactor = min(width, height) / 1200.0;
  resetGame();
  for (let i = 0; i < 100; i++) {
    stars[i] = createVector(random(width), random(height));
  }
  enemyFactory = new CustomEnemyFactory();
}

function draw() {
  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.95;
  }

  background(10, 10, 20);

  noStroke();
  for (let star of stars) {
    fill(255, 255, 255, 50);
    ellipse(star.x, star.y, 4 * scaleFactor, 4 * scaleFactor);
    fill(255, 255, 255, 150);
    ellipse(star.x, star.y, 2 * scaleFactor, 2 * scaleFactor);
    star.y += 0.8 * scaleFactor;
    if (star.y > height) star.y -= height;
  }

  stroke(0, 255, 255, 10);
  strokeWeight(0.5 * scaleFactor);
  for (let i = 0; i <= width; i += 50 * scaleFactor) {
    line(i, 0, i, height);
    line(0, i, width, i);
  }

  if (gameOver) {
    fill(0, 255, 255);
    stroke(255, 0, 255, 200);
    strokeWeight(4 * scaleFactor);
    textAlign(CENTER, CENTER);
    let pulse = 80 * scaleFactor + 8 * scaleFactor * sin(frameCount * 0.08);
    textSize(pulse);
    text("GAME OVER", width / 2, height / 2 - 50 * scaleFactor);
    textSize(pulse / 2);
    text("Score: " + score, width / 2, height / 2);
    text("Press SPACE to restart", width / 2, height / 2 + 50 * scaleFactor);
    noStroke();
    return;
  }

  let survivalTime = (frameCount - gameStartFrame) / 60.0;
  let killRate = enemiesDestroyed / max(survivalTime, 1.0) * 60.0;
  let skillLevel = constrain((score / 1000.0 + killRate / 20.0 + survivalTime / 240.0) / 3.0, 0, 1);

  if (score >= 200 && killRate >= 5 && survivalTime >= 60) {
    difficultyStage = 5;
  } else if (score < 50 && survivalTime < 30) {
    difficultyStage = 1;
  } else if ((score >= 50 || survivalTime >= 30) && killRate < 5) {
    difficultyStage = min(2 + int(survivalTime / 60), 3);
  } else {
    difficultyStage = 4;
  }

  myPlayer.update();
  myPlayer.draw();

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.update();
    b.draw();
    if (b.offscreen()) bullets.splice(i, 1);
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let eb = enemyBullets[i];
    eb.update();
    eb.draw();
    if (eb.offscreen()) {
      enemyBullets.splice(i, 1);
    } else if (p5.Vector.dist(eb.pos, myPlayer.pos) < 20 * scaleFactor) {
      enemyBullets.splice(i, 1);
      lives--;
      shakeAmount = 12 * scaleFactor;
      if (lives <= 0) gameOver = true;
    }
  }

  for (let i = blackHoles.length - 1; i >= 0; i--) {
    let bh = blackHoles[i];
    bh.update();
    bh.draw();
    if (bh.isExpired()) blackHoles.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update(myPlayer.pos);
    e.draw();

    for (let j = bullets.length - 1; j >= 0; j--) {
      let collisionRadius = (e instanceof WanderingEnemy) ? 20 * scaleFactor : 30 * scaleFactor;
      if (e instanceof CustomEnemy || e instanceof MineEnemy) collisionRadius = 25 * scaleFactor;
      if (p5.Vector.dist(bullets[j].pos, e.pos) < collisionRadius) {
        bullets.splice(j, 1);
        if (e instanceof SplittingEnemy && !e.isSmall) {
          let vel = e.vel.copy();
          let offset = vel.copy().rotate(HALF_PI).normalize().mult(10 * scaleFactor);
          enemies.push(new SplittingEnemy(p5.Vector.add(e.pos, offset), vel, true));
          enemies.push(new SplittingEnemy(p5.Vector.sub(e.pos, offset), vel, true));
          enemies.splice(i, 1);
        } else if (e instanceof CustomEnemy && e.isShielded) {
        } else if (e instanceof CustomEnemy && e.health > 1) {
          e.health--;
        } else {
          let explode = (e instanceof CustomEnemy) && e.hasAttribute("exploding");
          if (e instanceof ChasingEnemy) score += 10;
          else if (e instanceof ShootingEnemy) score += 50;
          else if (e instanceof SplittingEnemy) score += 15;
          else if (e instanceof WanderingEnemy) score += 2;
          else if (e instanceof CustomEnemy) score += 25;
          else if (e instanceof MineEnemy) score += 5;
          enemiesDestroyed++;
          lastKillTime = survivalTime;
          enemies.splice(i, 1);
          if (explode && p5.Vector.dist(e.pos, myPlayer.pos) < 50 * scaleFactor) {
            lives--;
            shakeAmount = 12 * scaleFactor;
            if (lives <= 0) gameOver = true;
          }
        }
        break;
      }
    }

    let collisionRadius = (e instanceof WanderingEnemy) ? 40 * scaleFactor : 40 * scaleFactor;
    if (e instanceof CustomEnemy || e instanceof MineEnemy) collisionRadius = 35 * scaleFactor;
    if (p5.Vector.dist(myPlayer.pos, e.pos) < collisionRadius) {
      let explode = (e instanceof CustomEnemy) && e.hasAttribute("exploding");
      enemies.splice(i, 1);
      lives--;
      shakeAmount = 12 * scaleFactor;
      if (e instanceof MineEnemy) lives--;
      if (explode && p5.Vector.dist(e.pos, myPlayer.pos) < 50 * scaleFactor) lives--;
      if (lives <= 0) gameOver = true;
    }
  }

  let spawnInterval = round(60 - survivalTime * 0.1);
  spawnInterval = constrain(spawnInterval, 30, 60);
  if (frameCount % spawnInterval == 0) {
    let r = random(1);
    if (difficultyStage == 1) {
      enemies.push(new WanderingEnemy());
    } else if (difficultyStage == 2) {
      if (r < 0.7) enemies.push(new WanderingEnemy());
      else enemies.push(new ChasingEnemy());
    } else if (difficultyStage == 3) {
      if (r < 0.5) enemies.push(new WanderingEnemy());
      else if (r < 0.8) enemies.push(new ChasingEnemy());
      else enemies.push(new SplittingEnemy());
    } else if (difficultyStage == 4) {
      if (r < 0.4) enemies.push(new WanderingEnemy());
      else if (r < 0.7) enemies.push(new ChasingEnemy());
      else if (r < 0.9) enemies.push(new SplittingEnemy());
      else enemies.push(new ShootingEnemy());
    } else if (difficultyStage == 5) {
      let customSpawnThreshold = 0.95 - skillLevel * 0.15;
      if (r < 0.3) enemies.push(new WanderingEnemy());
      else if (r < 0.55) enemies.push(new ChasingEnemy());
      else if (r < 0.8) enemies.push(new SplittingEnemy());
      else if (r < customSpawnThreshold) enemies.push(new ShootingEnemy());
      else enemies.push(enemyFactory.generateEnemy(skillLevel));
    }
  }

  fill(0, 255, 255);
  stroke(255, 0, 255, 150);
  strokeWeight(2 * scaleFactor);
  textSize(40 * scaleFactor);
  textAlign(LEFT);
  text("Lives: " + lives, 20 * scaleFactor, 60 * scaleFactor);
  text("Bombs: " + myPlayer.bombCount, 20 * scaleFactor, 100 * scaleFactor);
  text("Score: " + score, 20 * scaleFactor, 140 * scaleFactor);
  text("Stage: " + difficultyStage, 20 * scaleFactor, 180 * scaleFactor);
  noStroke();

  if (mouseIsPressed && mouseButton === RIGHT && !gameOver) {
    myPlayer.deployBlackHole();
  }
  if (keyIsPressed && key === ' ' && gameOver) {
    resetGame();
  }
  playerKeys.up = keyIsPressed && key === 'ArrowUp';
  playerKeys.down = keyIsPressed && key === 'ArrowDown';
  playerKeys.left = keyIsPressed && key === 'ArrowLeft';
  playerKeys.right = keyIsPressed && key === 'ArrowRight';
}

function mousePressed() {
  if (mouseButton === LEFT && !gameOver) {
    bullets.push(new Bullet(myPlayer.pos.copy(), myPlayer.angle));
  }
}

function keyReleased() {
  if (key === 'ArrowUp') playerKeys.up = false;
  if (key === 'ArrowDown') playerKeys.down = false;
  if (key === 'ArrowLeft') playerKeys.left = false;
  if (key === 'ArrowRight') playerKeys.right = false;
  myPlayer.stop();
}

function resetGame() {
  bullets = [];
  enemyBullets = [];
  enemies = [];
  blackHoles = [];
  myPlayer = new Player(scaleFactor);
  lives = 3;
  score = 0;
  gameOver = false;
  shakeAmount = 0;
  gameStartFrame = frameCount;
  difficultyStage = 1;
  enemiesDestroyed = 0;
  lastKillTime = 0;
}

class BlackHole {
  constructor(p, scale) {
    this.pos = p.copy();
    this.scaleFactor = scale;
    this.timer = 300;
    this.pullRadius = 100 * scaleFactor;
    this.destroyFlash = 0;
  }

  update() {
    this.timer--;
    if (this.destroyFlash > 0) this.destroyFlash *= 0.9;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.15);
    fill(255, 255, 255, 30);
    noStroke();
    ellipse(0, 0, 60 * this.scaleFactor * pulseScale, 60 * this.scaleFactor * pulseScale);
    fill(80, 0, 200);
    ellipse(0, 0, 40 * this.scaleFactor * pulseScale, 40 * this.scaleFactor * pulseScale);
    stroke(0, 255, 255, 200 + this.destroyFlash * 55);
    strokeWeight(4 * this.scaleFactor);
    for (let i = 0; i < 12; i++) {
      let angle = i * PI / 6 + frameCount * 0.12;
      let r1 = 12 * this.scaleFactor;
      let r2 = 35 * this.scaleFactor * pulseScale;
      line(r1 * cos(angle), r1 * sin(angle), r2 * cos(angle + 0.6), r2 * sin(angle + 0.6));
    }
    stroke(255, 255, 255, 150 + this.destroyFlash * 100);
    strokeWeight(3 * this.scaleFactor);
    noFill();
    ellipse(0, 0, this.pullRadius * 2, this.pullRadius * 2);
    pop();
  }

  isExpired() {
    return this.timer <= 0;
  }

  triggerFlash() {
    this.destroyFlash = 1.0;
  }
}

class Bullet {
  constructor(p, a) {
    this.pos = p.copy();
    this.vel = p5.Vector.fromAngle(a).mult(15);
    this.angle = a;
    this.trail = Array(8).fill().map(() => this.pos.copy());
  }

  update() {
    this.pos.add(this.vel);
    for (let i = this.trail.length - 1; i > 0; i--) {
      this.trail[i] = this.trail[i-1].copy();
    }
    this.trail[0] = this.pos.copy();
  }

  draw() {
    for (let i = 0; i < this.trail.length; i++) {
      fill(0, 255, 0, 200 - i * 25);
      noStroke();
      ellipse(this.trail[i].x, this.trail[i].y, (5 - i * 0.5) * scaleFactor, (5 - i * 0.5) * scaleFactor);
    }
    fill(0, 255, 0);
    ellipse(this.pos.x, this.pos.y, 6 * scaleFactor, 6 * scaleFactor);
    fill(0, 255, 0, 50);
    ellipse(this.pos.x, this.pos.y, 10 * scaleFactor, 10 * scaleFactor);
  }

  offscreen() {
    return this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height;
  }
}

class Enemy {
  constructor() {
    let edge = random(4);
    if (edge < 1) this.pos = createVector(0, random(height));
    else if (edge < 2) this.pos = createVector(width, random(height));
    else if (edge < 3) this.pos = createVector(random(width), 0);
    else this.pos = createVector(random(width), height);
    this.vel = createVector();
  }

  update(target) {
    for (let bh of blackHoles) {
      let dist = p5.Vector.dist(this.pos, bh.pos);
      if (dist < bh.pullRadius) {
        if (this instanceof ChasingEnemy) score += 10;
        else if (this instanceof ShootingEnemy) score += 50;
        else if (this instanceof SplittingEnemy) score += 15;
        else if (this instanceof WanderingEnemy) score += 2;
        enemies.splice(enemies.indexOf(this), 1);
        bh.triggerFlash();
        return;
      }
    }
  }
}

class WanderingEnemy extends Enemy {
  constructor() {
    super();
    this.pulsePhase = random(TWO_PI);
    this.directionChangeTimer = 0;
    this.vel = p5.Vector.fromAngle(random(TWO_PI)).mult(2 * scaleFactor);
  }

  update(target) {
    super.update(target);
    if (enemies.includes(this)) {
      this.directionChangeTimer++;
      if (this.directionChangeTimer >= 120) {
        this.vel = p5.Vector.fromAngle(random(TWO_PI)).mult(2 * scaleFactor);
        this.directionChangeTimer = 0;
      }
      this.pos.add(this.vel);
      if (this.pos.x < 0) this.pos.x += width;
      if (this.pos.x > width) this.pos.x -= width;
      if (this.pos.y < 0) this.pos.y += height;
      if (this.pos.y > height) this.pos.y -= height;
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.12 + this.pulsePhase);
    scale(pulseScale * scaleFactor);
    fill(0, 255, 255, 50);
    noStroke();
    beginShape();
    vertex(-20, -12);
    vertex(20, -12);
    vertex(12, 12);
    vertex(-12, 12);
    endShape(CLOSE);
    fill(128, 0, 255);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * scaleFactor);
    beginShape();
    vertex(-15, -9);
    vertex(15, -9);
    vertex(9, 9);
    vertex(-9, 9);
    endShape(CLOSE);
    fill(0, 255, 255, 200);
    noStroke();
    beginShape();
    vertex(-9, -6);
    vertex(9, -6);
    vertex(6, 6);
    vertex(-6, 6);
    endShape(CLOSE);
    pop();
  }
}

class ChasingEnemy extends Enemy {
  constructor() {
    super();
    this.pulsePhase = random(TWO_PI);
  }

  update(target) {
    super.update(target);
    if (enemies.includes(this)) {
      this.vel = p5.Vector.sub(target, this.pos).normalize().mult(4 * scaleFactor);
      this.pos.add(this.vel);
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.12 + this.pulsePhase);
    scale(pulseScale * scaleFactor);
    fill(255, 255, 0, 50);
    noStroke();
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = i * PI / 3;
      vertex(25 * cos(angle), 25 * sin(angle));
    }
    endShape(CLOSE);
    fill(255, 0, 0);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * scaleFactor);
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = i * PI / 3;
      vertex(20 * cos(angle), 20 * sin(angle));
    }
    endShape(CLOSE);
    fill(255, 255, 0, 200);
    noStroke();
    beginShape();
    for (let i = 0; i < 10; i++) {
      let r = (i % 2 == 0) ? 10 : 5;
      let angle = i * PI / 5;
      vertex(r * cos(angle), r * sin(angle));
    }
    endShape(CLOSE);
    pop();
  }
}

class SplittingEnemy extends Enemy {
  constructor(pos = null, vel = null, isSmall = false) {
    super();
    if (pos) this.pos = pos;
    if (vel) this.vel = vel;
    this.pulsePhase = random(TWO_PI);
    this.isSmall = isSmall;
    this.size = isSmall ? 20 : 40;
  }

  update(target) {
    super.update(target);
    if (enemies.includes(this)) {
      this.vel = p5.Vector.sub(target, this.pos).normalize().mult(2.5 * scaleFactor);
      this.pos.add(this.vel);
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.12 + this.pulsePhase);
    scale(pulseScale * scaleFactor);
    fill(0, 255, 0, 50);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, this.size * 1.2, this.size * 0.6);
    fill(0, 128, 255);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * scaleFactor);
    rect(0, 0, this.size, this.size * 0.5);
    fill(0, 255, 0, 200);
    noStroke();
    rect(0, 0, this.size * 0.6, this.size * 0.3);
    pop();
  }
}

class ShootingEnemy extends Enemy {
  constructor() {
    super();
    this.pulsePhase = random(TWO_PI);
    this.shootTimer = 0;
  }

  update(target) {
    super.update(target);
    if (enemies.includes(this)) {
      this.vel = p5.Vector.sub(target, this.pos).normalize().mult(2.8 * scaleFactor);
      this.pos.add(this.vel);
      this.shootTimer++;
      if (this.shootTimer >= 120) {
        let angle = atan2(target.y - this.pos.y, target.x - this.pos.x);
        enemyBullets.push(new EnemyBullet(this.pos.copy(), angle));
        this.shootTimer = 0;
      }
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.12 + this.pulsePhase);
    scale(pulseScale * scaleFactor);
    fill(255, 255, 255, 50);
    noStroke();
    beginShape();
    vertex(0, -25);
    vertex(-25, 25);
    vertex(25, 25);
    endShape(CLOSE);
    fill(255, 0, 255);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * scaleFactor);
    beginShape();
    vertex(0, -20);
    vertex(-20, 20);
    vertex(20, 20);
    endShape(CLOSE);
    fill(255, 255, 255, 200);
    noStroke();
    beginShape();
    vertex(0, -12);
    vertex(-12, 12);
    vertex(12, 12);
    endShape(CLOSE);
    pop();
  }
}

class CustomEnemy extends Enemy {
  constructor(shape, bodyColor, glowColor, speed, attributes) {
    super();
    this.shape = shape;
    this.bodyColor = bodyColor;
    this.glowColor = glowColor;
    this.speed = speed;
    this.attributes = attributes;
    this.pulsePhase = random(TWO_PI);
    this.teleportTimer = 0;
    this.shootTimer = 0;
    this.mineTimer = 0;
    this.shieldTimer = 0;
    this.erraticTimer = 0;
    this.health = 2;
    this.isShielded = false;
    this.spawnPos = this.pos.copy();
    this.boomerangPhase = 0;
  }

  update(target) {
    super.update(target);
    if (enemies.includes(this)) {
      this.teleportTimer += 1.0 / 60.0;
      this.shootTimer += 1.0 / 60.0;
      this.mineTimer += 1.0 / 60.0;
      this.shieldTimer += 1.0 / 60.0;
      this.erraticTimer += 1.0 / 60.0;
      this.boomerangPhase += 0.005;
      if (this.boomerangPhase > 1) this.boomerangPhase -= 1;

      if (this.hasAttribute("shielding")) {
        if (this.shieldTimer < 3.0) {
          this.isShielded = true;
        } else if (this.shieldTimer >= 10.0) {
          this.isShielded = false;
          this.shieldTimer = 0;
        }
      }

      let hasMovement = false;
      for (let attr of this.attributes) {
        if (attr === "chasing") {
          this.vel = p5.Vector.sub(target, this.pos).normalize().mult(this.speed);
          hasMovement = true;
        } else if (attr === "fleeing") {
          this.vel = p5.Vector.sub(this.pos, target).normalize().mult(this.speed);
          hasMovement = true;
        } else if (attr === "orbiting") {
          let toTarget = p5.Vector.sub(target, this.pos);
          let dist = toTarget.mag();
          let targetDist = 150 * scaleFactor;
          let tangent = toTarget.copy().rotate(HALF_PI).normalize().mult(this.speed);
          if (dist > targetDist) {
            this.vel = toTarget.normalize().mult(this.speed * 0.5).add(tangent);
          } else {
            this.vel = tangent;
          }
          hasMovement = true;
        } else if (attr === "erratic" && this.erraticTimer >= 0.5) {
          this.vel = p5.Vector.random2D().mult(this.speed);
          this.erraticTimer = 0;
          hasMovement = true;
        } else if (attr === "boomerang") {
          let t = this.boomerangPhase < 0.5 ? this.boomerangPhase * 2 : (1 - (this.boomerangPhase - 0.5) * 2);
          let targetPos = p5.Vector.lerp(this.spawnPos, target, t);
          this.vel = p5.Vector.sub(targetPos, this.pos).normalize().mult(this.speed);
          hasMovement = true;
        }
      }
      if (!hasMovement) this.vel = p5.Vector.random2D().mult(this.speed);
      this.pos.add(this.vel);

      if (this.hasAttribute("teleporting") && this.teleportTimer >= 2.0) {
        let newPos;
        let attempts = 0;
        do {
          newPos = p5.Vector.random2D().mult(random(100, 200) * scaleFactor).add(this.pos);
          newPos.x = constrain(newPos.x, 0, width);
          newPos.y = constrain(newPos.y, 0, height);
          attempts++;
        } while (p5.Vector.dist(newPos, target) < 100 * scaleFactor && attempts < 10);
        this.pos.set(newPos);
        this.teleportTimer = 0;
      }

      if (this.hasAttribute("shooting") && this.shootTimer >= 2.0) {
        let angle = atan2(target.y - this.pos.y, target.x - this.pos.x);
        enemyBullets.push(new EnemyBullet(this.pos.copy(), angle, this.hasAttribute("homing")));
        this.shootTimer = 0;
      }

      if (this.hasAttribute("mine-dropping") && this.mineTimer >= 3.0) {
        enemies.push(new MineEnemy(this.pos.copy()));
        this.mineTimer = 0;
      }
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.15 * sin(frameCount * 0.12 + this.pulsePhase);
    scale(pulseScale * scaleFactor);
    if (this.isShielded) {
      fill(255, 255, 255, 100);
      noStroke();
      this.drawShape(this.shape, 40);
    }
    fill(this.glowColor, 50);
    noStroke();
    this.drawShape(this.shape, 35);
    fill(this.isShielded ? color(255, 255, 255) : this.bodyColor);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * scaleFactor);
    this.drawShape(this.shape, 30);
    fill(this.glowColor, 200);
    noStroke();
    this.drawShape(this.shape, 15);
    pop();
  }

  hasAttribute(attr) {
    return this.attributes.includes(attr);
  }

  drawShape(shapeType, radius) {
    beginShape();
    if (shapeType === "pentagon") {
      for (let i = 0; i < 5; i++) {
        let angle = i * TWO_PI / 5 - HALF_PI;
        vertex(radius * cos(angle), radius * sin(angle));
      }
    } else if (shapeType === "octagon") {
      for (let i = 0; i < 8; i++) {
        let angle = i * TWO_PI / 8 - HALF_PI;
        vertex(radius * cos(angle), radius * sin(angle));
      }
    } else if (shapeType === "star") {
      for (let i = 0; i < 10; i++) {
        let r = (i % 2 === 0) ? radius : radius * 0.5;
        let angle = i * TWO_PI / 10 - HALF_PI;
        vertex(r * cos(angle), r * sin(angle));
      }
    } else if (shapeType === "heptagon") {
      for (let i = 0; i < 7; i++) {
        let angle = i * TWO_PI / 7 - HALF_PI;
        vertex(radius * cos(angle), radius * sin(angle));
      }
    } else if (shapeType === "cross") {
      let r = radius * 0.7;
      vertex(0, -radius); vertex(r, -r); vertex(radius, 0);
      vertex(r, r); vertex(0, radius); vertex(-r, r);
      vertex(-radius, 0); vertex(-r, -r);
    } else if (shapeType === "triangle") {
      for (let i = 0; i < 3; i++) {
        let angle = i * TWO_PI / 3 - HALF_PI;
        vertex(radius * cos(angle), radius * sin(angle));
      }
    }
    endShape(CLOSE);
  }
}

class MineEnemy extends Enemy {
  constructor(pos) {
    super();
    this.pos = pos;
    this.vel = createVector(0, 0);
  }

  update(target) {
    super.update(target);
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    let pulseScale = 1 + 0.1 * sin(frameCount * 0.15);
    scale(pulseScale * scaleFactor);
    fill(255, 0, 0, 50);
    noStroke();
    ellipse(0, 0, 20, 20);
    fill(255, 0, 0);
    stroke(255, 255, 255, 150);
    strokeWeight(2 * scaleFactor);
    ellipse(0, 0, 15, 15);
    pop();
  }
}

class CustomEnemyFactory {
  constructor() {
    this.shapes = ["pentagon", "octagon", "star", "heptagon", "cross", "triangle"];
    this.bodyColors = [color(255, 0, 255), color(0, 255, 0), color(255, 165, 0), color(0, 191, 255), color(148, 0, 211)];
    this.glowColors = [color(0, 255, 255), color(255, 255, 0), color(255, 255, 255), color(50, 205, 50), color(255, 20, 147)];
    this.speeds = [2.0, 3.0, 4.0];
    this.attributes = ["chasing", "shooting", "teleporting", "mine-dropping", "fleeing", "exploding", "homing", "shielding", "orbiting", "erratic", "boomerang"];
  }

  generateEnemy(skillLevel) {
    let shape = this.shapes[int(random(this.shapes.length))];
    let bodyColor = this.bodyColors[int(random(this.bodyColors.length))];
    let glowColor = this.glowColors[int(random(this.glowColors.length))];
    let speed = this.speeds[int(map(skillLevel, 0, 1, 0, this.speeds.length - 1))] * scaleFactor;
    let numAttributes = skillLevel > 0.75 ? 2 : 1;
    let selectedAttributes = [];
    for (let i = 0; i < numAttributes; i++) {
      let attr;
      do {
        attr = this.attributes[int(random(this.attributes.length))];
        if (i === 1 && (attr === "homing" || attr === "shielding") && 
            (selectedAttributes[0] === "homing" || selectedAttributes[0] === "shielding")) {
          continue;
        }
      } while (selectedAttributes.includes(attr));
      selectedAttributes.push(attr);
    }
    return new CustomEnemy(shape, bodyColor, glowColor, speed, selectedAttributes);
  }
}

class EnemyBullet {
  constructor(p, angle, isHoming = false) {
    this.pos = p.copy();
    this.vel = p5.Vector.fromAngle(angle).mult(10 * scaleFactor);
    this.isHoming = isHoming;
    this.trail = Array(5).fill().map(() => this.pos.copy());
  }

  update() {
    if (this.isHoming) {
      let target = myPlayer.pos;
      let desired = p5.Vector.sub(target, this.pos).normalize().mult(10 * scaleFactor);
      this.vel.lerp(desired, 0.05);
      this.vel.limit(10 * scaleFactor);
    }
    this.pos.add(this.vel);
    for (let i = this.trail.length - 1; i > 0; i--) {
      this.trail[i] = this.trail[i-1].copy();
    }
    this.trail[0] = this.pos.copy();
  }

  draw() {
    for (let i = 0; i < this.trail.length; i++) {
      fill(this.isHoming ? color(255, 105, 180) : color(255, 0, 128), 100 - i * 20);
      noStroke();
      ellipse(this.trail[i].x, this.trail[i].y, (8 - i * 1) * scaleFactor, (8 - i * 1) * scaleFactor);
    }
    fill(this.isHoming ? color(255, 105, 180) : color(255, 0, 255));
    ellipse(this.pos.x, this.pos.y, 10 * scaleFactor, 10 * scaleFactor);
    fill(this.isHoming ? color(255, 105, 180, 50) : color(255, 0, 255, 50));
    ellipse(this.pos.x, this.pos.y, 15 * scaleFactor, 15 * scaleFactor);
  }

  offscreen() {
    return this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height;
  }
}

class Player {
  constructor(scale) {
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector();
    this.angle = 0;
    this.scaleFactor = scale;
    this.bombCount = 3;
    this.bombRegenTimer = 0;
  }

  update() {
    let input = createVector();
    if (playerKeys.up) input.y -= 1;
    if (playerKeys.down) input.y += 1;
    if (playerKeys.left) input.x -= 1;
    if (playerKeys.right) input.x += 1;
    input.normalize();
    input.mult(4.5);
    this.vel = input;
    this.pos.add(this.vel);
    let minX = 20 * this.scaleFactor;
    let maxX = width - 25 * this.scaleFactor;
    let minY = 15 * this.scaleFactor;
    let maxY = height - 15 * this.scaleFactor;
    this.pos.x = constrain(this.pos.x, minX, maxX);
    this.pos.y = constrain(this.pos.y, minY, maxY);
    this.angle = atan2(mouseY - this.pos.y, mouseX - this.pos.x);
    this.bombRegenTimer++;
    if (this.bombRegenTimer >= 1800 && this.bombCount < 3) {
      this.bombCount++;
      this.bombRegenTimer = 0;
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(0, 255, 255, 50);
    noStroke();
    triangle(-25 * this.scaleFactor, -20 * this.scaleFactor, -25 * this.scaleFactor, 20 * this.scaleFactor, 30 * this.scaleFactor, 0);
    fill(0, 255, 255);
    stroke(255, 255, 255, 150);
    strokeWeight(3 * this.scaleFactor);
    triangle(-20 * this.scaleFactor, -15 * this.scaleFactor, -20 * this.scaleFactor, 15 * this.scaleFactor, 25 * this.scaleFactor, 0);
    stroke(255, 0, 255, 200);
    strokeWeight(5 * this.scaleFactor);
    line(-15 * this.scaleFactor, -15 * this.scaleFactor, -30 * this.scaleFactor, -22 * this.scaleFactor);
    line(-15 * this.scaleFactor, 15 * this.scaleFactor, -30 * this.scaleFactor, 22 * this.scaleFactor);
    fill(255, 255, 255, 200);
    noStroke();
    ellipse(10 * this.scaleFactor, 0, 10 * this.scaleFactor, 10 * this.scaleFactor);
    fill(255, 255, 255, 50);
    ellipse(10 * this.scaleFactor, 0, 15 * this.scaleFactor, 15 * this.scaleFactor);
    pop();
  }

  stop() {
    this.vel = createVector(0, 0);
  }

  deployBlackHole() {
    if (this.bombCount > 0 && !gameOver) {
      blackHoles.push(new BlackHole(this.pos.copy(), this.scaleFactor));
      this.bombCount--;
    }
  }
}