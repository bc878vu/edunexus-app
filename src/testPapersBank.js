// src/testPapersBank.js — verified lecture-mapped question bank for the
// Intelligent Paper Builder.
//
// SOURCE: the EduNexus PHY101 midterm banks, verbatim — the 145-question MCQ
// bank and the 35-question subjective solved bank. No question here was
// written or invented by AI; every question is copied from those banks.
// LECTURE TAGS: each question is tagged with the handout lesson(s) whose
// topic it covers (handout lesson titles are in PHY101_LECTURES). Circular
// motion is tagged [3, 11] because it is taught in both Kinematics II and
// Rotational Kinematics. A question whose lecture could not be fixed
// confidently was left OUT — nothing in this file is a guess.
// "repeated": the question's concept also appears in the subjective bank,
// i.e. it is tested in both formats — the only importance signal used.
// Lectures 16, 17, 18, 19, 20 and 22 have ZERO questions in the banks; the
// builder shows that honestly instead of inventing questions to fill them.
export const PHY101_LECTURES = [
  {
    "n": 1,
    "title": "Introduction to Physics"
  },
  {
    "n": 2,
    "title": "Kinematics I"
  },
  {
    "n": 3,
    "title": "Kinematics II"
  },
  {
    "n": 4,
    "title": "Force and Newton\u2019s Laws"
  },
  {
    "n": 5,
    "title": "Applications of Newton\u2019s Laws \u2013 I"
  },
  {
    "n": 6,
    "title": "Applications of Newton\u2019s Laws \u2013 II"
  },
  {
    "n": 7,
    "title": "Work and Energy"
  },
  {
    "n": 8,
    "title": "Conservation of Energy"
  },
  {
    "n": 9,
    "title": "Momentum"
  },
  {
    "n": 10,
    "title": "Collisions"
  },
  {
    "n": 11,
    "title": "Rotational Kinematics"
  },
  {
    "n": 12,
    "title": "Physics of Many Particles"
  },
  {
    "n": 13,
    "title": "Angular Momentum"
  },
  {
    "n": 14,
    "title": "Equilibrium of Rigid Bodies"
  },
  {
    "n": 15,
    "title": "Oscillations: I"
  },
  {
    "n": 16,
    "title": "Oscillations: II"
  },
  {
    "n": 17,
    "title": "Physics of Materials"
  },
  {
    "n": 18,
    "title": "Physics of Fluids"
  },
  {
    "n": 19,
    "title": "Physics of Sound"
  },
  {
    "n": 20,
    "title": "Wave Motion"
  },
  {
    "n": 21,
    "title": "Gravity"
  },
  {
    "n": 22,
    "title": "Electrostatics I"
  }
];
export const PHY101_BANK = {
  "mcqs": [
    {
      "id": "Q001",
      "q": "Which of the following is a fundamental SI unit?",
      "options": [
        {
          "letter": "A",
          "text": "Newton"
        },
        {
          "letter": "B",
          "text": "Joule"
        },
        {
          "letter": "C",
          "text": "Kilogram"
        },
        {
          "letter": "D",
          "text": "Watt"
        }
      ],
      "answer": "C",
      "explanation": "Mass is a fundamental quantity; the kilogram is its SI base unit. Newton, joule and watt are derived units.",
      "lectures": [
        1
      ],
      "concept": "units",
      "repeated": false
    },
    {
      "id": "Q002",
      "q": "The SI unit of force is:",
      "options": [
        {
          "letter": "A",
          "text": "Kilogram"
        },
        {
          "letter": "B",
          "text": "Newton"
        },
        {
          "letter": "C",
          "text": "Joule"
        },
        {
          "letter": "D",
          "text": "Pascal"
        }
      ],
      "answer": "B",
      "explanation": "Force = mass x acceleration, so its SI unit is kg m/s^2, named the newton.",
      "lectures": [
        1
      ],
      "concept": "units",
      "repeated": false
    },
    {
      "id": "Q003",
      "q": "Which of the following quantities is a scalar?",
      "options": [
        {
          "letter": "A",
          "text": "Velocity"
        },
        {
          "letter": "B",
          "text": "Acceleration"
        },
        {
          "letter": "C",
          "text": "Speed"
        },
        {
          "letter": "D",
          "text": "Displacement"
        }
      ],
      "answer": "C",
      "explanation": "Speed has magnitude only, so it is a scalar. Velocity, acceleration and displacement have direction too.",
      "lectures": [
        1
      ],
      "concept": "scalar-vector",
      "repeated": true
    },
    {
      "id": "Q004",
      "q": "Which of the following is a vector quantity?",
      "options": [
        {
          "letter": "A",
          "text": "Distance"
        },
        {
          "letter": "B",
          "text": "Temperature"
        },
        {
          "letter": "C",
          "text": "Force"
        },
        {
          "letter": "D",
          "text": "Energy"
        }
      ],
      "answer": "C",
      "explanation": "Force has both magnitude and direction, so it is a vector. EduNexus",
      "lectures": [
        1
      ],
      "concept": "scalar-vector",
      "repeated": true
    },
    {
      "id": "Q005",
      "q": "The dimension of velocity is:",
      "options": [
        {
          "letter": "A",
          "text": "[M L T^-1]"
        },
        {
          "letter": "B",
          "text": "[L T^-1]"
        },
        {
          "letter": "C",
          "text": "[L T^-2]"
        },
        {
          "letter": "D",
          "text": "[M L^2 T^-2]"
        }
      ],
      "answer": "B",
      "explanation": "Velocity = displacement/time, so its dimension is [L T^-1].",
      "lectures": [
        1
      ],
      "concept": "dimensions",
      "repeated": false
    },
    {
      "id": "Q006",
      "q": "The dimension of force is:",
      "options": [
        {
          "letter": "A",
          "text": "[M L T^-1]"
        },
        {
          "letter": "B",
          "text": "[M L T^-2]"
        },
        {
          "letter": "C",
          "text": "[M L^2 T^-2]"
        },
        {
          "letter": "D",
          "text": "[L T^-2]"
        }
      ],
      "answer": "B",
      "explanation": "Force = mass x acceleration, giving [M][L T^-2] = [M L T^-2].",
      "lectures": [
        1
      ],
      "concept": "dimensions",
      "repeated": false
    },
    {
      "id": "Q007",
      "q": "1 nanometer is equal to:",
      "options": [
        {
          "letter": "A",
          "text": "10^-6 m"
        },
        {
          "letter": "B",
          "text": "10^-9 m"
        },
        {
          "letter": "C",
          "text": "10^-12 m"
        },
        {
          "letter": "D",
          "text": "10^-3 m"
        }
      ],
      "answer": "B",
      "explanation": "Nano is the prefix for 10^-9, so 1 nm = 10^-9 m.",
      "lectures": [
        1
      ],
      "concept": "units",
      "repeated": false
    },
    {
      "id": "Q008",
      "q": "Which prefix represents 10^6?",
      "options": [
        {
          "letter": "A",
          "text": "Mega"
        },
        {
          "letter": "B",
          "text": "Giga"
        },
        {
          "letter": "C",
          "text": "Kilo"
        },
        {
          "letter": "D",
          "text": "Micro"
        }
      ],
      "answer": "A",
      "explanation": "Mega = 10^6, kilo = 10^3, giga = 10^9, micro = 10^-6.",
      "lectures": [
        1
      ],
      "concept": "units",
      "repeated": false
    },
    {
      "id": "Q009",
      "q": "The number of significant figures in 0.00450 is:",
      "options": [
        {
          "letter": "A",
          "text": "2"
        },
        {
          "letter": "B",
          "text": "3"
        },
        {
          "letter": "C",
          "text": "4"
        },
        {
          "letter": "D",
          "text": "5"
        }
      ],
      "answer": "B",
      "explanation": "Leading zeros are not significant; the trailing zero after the 5 is significant, so 4, 5 and 0 give 3 significant figures. EduNexus",
      "lectures": [
        1
      ],
      "concept": "sig-figs",
      "repeated": false
    },
    {
      "id": "Q010",
      "q": "The number of significant figures in 100.0 is:",
      "options": [
        {
          "letter": "A",
          "text": "1"
        },
        {
          "letter": "B",
          "text": "2"
        },
        {
          "letter": "C",
          "text": "3"
        },
        {
          "letter": "D",
          "text": "4"
        }
      ],
      "answer": "D",
      "explanation": "The decimal point makes all zeros significant, so 100.0 has 4 significant figures.",
      "lectures": [
        1
      ],
      "concept": "sig-figs",
      "repeated": false
    },
    {
      "id": "Q011",
      "q": "Two vectors A and B are perpendicular. Their dot product A . B equals:",
      "options": [
        {
          "letter": "A",
          "text": "|A||B|"
        },
        {
          "letter": "B",
          "text": "0"
        },
        {
          "letter": "C",
          "text": "AB cos 0"
        },
        {
          "letter": "D",
          "text": "|A||B| sin 90"
        }
      ],
      "answer": "B",
      "explanation": "A . B = AB cos(theta); with theta = 90 degrees, cos 90 = 0.",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q012",
      "q": "The cross product of two parallel vectors is:",
      "options": [
        {
          "letter": "A",
          "text": "Maximum"
        },
        {
          "letter": "B",
          "text": "Equal to their dot product"
        },
        {
          "letter": "C",
          "text": "Zero"
        },
        {
          "letter": "D",
          "text": "Equal to AB"
        }
      ],
      "answer": "C",
      "explanation": "A x B = AB sin(theta); parallel vectors have theta = 0 or 180 degrees, so sin = 0.",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q013",
      "q": "The magnitude of the cross product A x B is maximum when the angle between them is:",
      "options": [
        {
          "letter": "A",
          "text": "0 degrees"
        },
        {
          "letter": "B",
          "text": "45 degrees"
        },
        {
          "letter": "C",
          "text": "90 degrees"
        },
        {
          "letter": "D",
          "text": "180 degrees"
        }
      ],
      "answer": "C",
      "explanation": "|A x B| = AB sin(theta), maximum at theta = 90 degrees where sin = 1. EduNexus",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q014",
      "q": "A vector can be resolved into components along:",
      "options": [
        {
          "letter": "A",
          "text": "Only x-axis"
        },
        {
          "letter": "B",
          "text": "Only y-axis"
        },
        {
          "letter": "C",
          "text": "Any two perpendicular directions"
        },
        {
          "letter": "D",
          "text": "Only one direction"
        }
      ],
      "answer": "C",
      "explanation": "A vector is usually resolved into rectangular (perpendicular) components, e.g. x and y.",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q015",
      "q": "If a vector A has components Ax = 3 and Ay = 4, its magnitude is:",
      "options": [
        {
          "letter": "A",
          "text": "7"
        },
        {
          "letter": "B",
          "text": "5"
        },
        {
          "letter": "C",
          "text": "12"
        },
        {
          "letter": "D",
          "text": "25"
        }
      ],
      "answer": "B",
      "explanation": "|A| = sqrt(3^2 + 4^2) = sqrt(25) = 5.",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q016",
      "q": "A car moves 3 km east and then 4 km north. Its resultant displacement is:",
      "options": [
        {
          "letter": "A",
          "text": "7 km"
        },
        {
          "letter": "B",
          "text": "1 km"
        },
        {
          "letter": "C",
          "text": "5 km"
        },
        {
          "letter": "D",
          "text": "12 km"
        }
      ],
      "answer": "C",
      "explanation": "Resultant = sqrt(3^2 + 4^2) = 5 km, directed northeast.",
      "lectures": [
        2
      ],
      "concept": "vector-addition",
      "repeated": false
    },
    {
      "id": "Q017",
      "q": "Distance is always ____ displacement for a moving body.",
      "options": [
        {
          "letter": "A",
          "text": "Equal to"
        },
        {
          "letter": "B",
          "text": "Less than"
        },
        {
          "letter": "C",
          "text": "Greater than or equal to"
        },
        {
          "letter": "D",
          "text": "Less than or equal to"
        }
      ],
      "answer": "C",
      "explanation": "Distance is the path length; displacement is the straight-line change, so distance >= |displacement|. EduNexus",
      "lectures": [
        2
      ],
      "concept": "distance-displacement",
      "repeated": true
    },
    {
      "id": "Q018",
      "q": "The slope of a displacement-time graph gives:",
      "options": [
        {
          "letter": "A",
          "text": "Acceleration"
        },
        {
          "letter": "B",
          "text": "Velocity"
        },
        {
          "letter": "C",
          "text": "Force"
        },
        {
          "letter": "D",
          "text": "Distance"
        }
      ],
      "answer": "B",
      "explanation": "Slope = change in displacement / change in time = velocity.",
      "lectures": [
        2
      ],
      "concept": "motion-graphs",
      "repeated": false
    },
    {
      "id": "Q019",
      "q": "The slope of a velocity-time graph gives:",
      "options": [
        {
          "letter": "A",
          "text": "Displacement"
        },
        {
          "letter": "B",
          "text": "Acceleration"
        },
        {
          "letter": "C",
          "text": "Speed"
        },
        {
          "letter": "D",
          "text": "Momentum"
        }
      ],
      "answer": "B",
      "explanation": "Slope = change in velocity / change in time = acceleration.",
      "lectures": [
        2
      ],
      "concept": "motion-graphs",
      "repeated": false
    },
    {
      "id": "Q020",
      "q": "The area under a velocity-time graph gives:",
      "options": [
        {
          "letter": "A",
          "text": "Acceleration"
        },
        {
          "letter": "B",
          "text": "Force"
        },
        {
          "letter": "C",
          "text": "Displacement"
        },
        {
          "letter": "D",
          "text": "Power"
        }
      ],
      "answer": "C",
      "explanation": "Area = velocity x time = displacement.",
      "lectures": [
        2
      ],
      "concept": "motion-graphs",
      "repeated": false
    },
    {
      "id": "Q021",
      "q": "The area under an acceleration-time graph gives:",
      "options": [
        {
          "letter": "A",
          "text": "Displacement"
        },
        {
          "letter": "B",
          "text": "Change in velocity"
        },
        {
          "letter": "C",
          "text": "Force"
        },
        {
          "letter": "D",
          "text": "Distance"
        }
      ],
      "answer": "B",
      "explanation": "Area = acceleration x time = change in velocity.",
      "lectures": [
        2
      ],
      "concept": "motion-graphs",
      "repeated": false
    },
    {
      "id": "Q022",
      "q": "A body moving with constant velocity has:",
      "options": [
        {
          "letter": "A",
          "text": "Constant acceleration"
        },
        {
          "letter": "B",
          "text": "Zero acceleration"
        },
        {
          "letter": "C",
          "text": "Increasing speed"
        },
        {
          "letter": "D",
          "text": "Decreasing speed"
        }
      ],
      "answer": "B",
      "explanation": "Constant velocity means no change in velocity, so acceleration is zero. EduNexus",
      "lectures": [
        2
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q023",
      "q": "Which equation of motion is correct for constant acceleration?",
      "options": [
        {
          "letter": "A",
          "text": "v = u + at^2"
        },
        {
          "letter": "B",
          "text": "s = ut + at^2"
        },
        {
          "letter": "C",
          "text": "v^2 = u^2 + 2as"
        },
        {
          "letter": "D",
          "text": "s = ut - 2as"
        }
      ],
      "answer": "C",
      "explanation": "The standard equations are v = u + at, s = ut + (1/2)at^2, v^2 = u^2 + 2as.",
      "lectures": [
        3
      ],
      "concept": "equations-of-motion",
      "repeated": true
    },
    {
      "id": "Q024",
      "q": "A ball is dropped from rest. After 2 s, its velocity is approximately: (g = 10 m/s^2)",
      "options": [
        {
          "letter": "A",
          "text": "10 m/s"
        },
        {
          "letter": "B",
          "text": "20 m/s"
        },
        {
          "letter": "C",
          "text": "5 m/s"
        },
        {
          "letter": "D",
          "text": "40 m/s"
        }
      ],
      "answer": "B",
      "explanation": "v = u + gt = 0 + 10 x 2 = 20 m/s.",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q025",
      "q": "A stone is thrown vertically upward with 20 m/s. The maximum height reached is: (g = 10 m/s^2)",
      "options": [
        {
          "letter": "A",
          "text": "10 m"
        },
        {
          "letter": "B",
          "text": "20 m"
        },
        {
          "letter": "C",
          "text": "40 m"
        },
        {
          "letter": "D",
          "text": "200 m"
        }
      ],
      "answer": "B",
      "explanation": "At max height v = 0: h = u^2/(2g) = 400/20 = 20 m.",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q026",
      "q": "At the highest point of a vertically thrown projectile, its velocity is:",
      "options": [
        {
          "letter": "A",
          "text": "Maximum"
        },
        {
          "letter": "B",
          "text": "Equal to initial velocity"
        },
        {
          "letter": "C",
          "text": "Zero"
        },
        {
          "letter": "D",
          "text": "Equal to g"
        }
      ],
      "answer": "C",
      "explanation": "The body momentarily stops at the top before falling back, so velocity is zero. EduNexus",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q027",
      "q": "In projectile motion, the horizontal component of velocity:",
      "options": [
        {
          "letter": "A",
          "text": "Increases with time"
        },
        {
          "letter": "B",
          "text": "Decreases with time"
        },
        {
          "letter": "C",
          "text": "Remains constant"
        },
        {
          "letter": "D",
          "text": "Becomes zero at the top"
        }
      ],
      "answer": "C",
      "explanation": "Ignoring air resistance, no horizontal force acts, so horizontal velocity stays constant.",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q028",
      "q": "The range of a projectile is maximum when the angle of projection is:",
      "options": [
        {
          "letter": "A",
          "text": "30 degrees"
        },
        {
          "letter": "B",
          "text": "45 degrees"
        },
        {
          "letter": "C",
          "text": "60 degrees"
        },
        {
          "letter": "D",
          "text": "90 degrees"
        }
      ],
      "answer": "B",
      "explanation": "Range = (u^2 sin 2theta)/g, maximum when sin 2theta = 1, i.e. theta = 45 degrees.",
      "lectures": [
        3
      ],
      "concept": "projectile-range",
      "repeated": true
    },
    {
      "id": "Q029",
      "q": "Two projectiles launched at 30 and 60 degrees with the same speed have:",
      "options": [
        {
          "letter": "A",
          "text": "Different ranges"
        },
        {
          "letter": "B",
          "text": "The same range"
        },
        {
          "letter": "C",
          "text": "Zero range"
        },
        {
          "letter": "D",
          "text": "Maximum height equal"
        }
      ],
      "answer": "B",
      "explanation": "sin(2x30) = sin(2x60) = sin 60, so ranges are equal for complementary angles.",
      "lectures": [
        3
      ],
      "concept": "projectile-range",
      "repeated": true
    },
    {
      "id": "Q030",
      "q": "The time of flight of a projectile depends on:",
      "options": [
        {
          "letter": "A",
          "text": "Horizontal velocity only"
        },
        {
          "letter": "B",
          "text": "Vertical component of velocity"
        },
        {
          "letter": "C",
          "text": "Mass of projectile"
        },
        {
          "letter": "D",
          "text": "Air density only"
        }
      ],
      "answer": "B",
      "explanation": "T = 2u sin(theta)/g depends on the vertical component of initial velocity. EduNexus",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q031",
      "q": "Uniform circular motion has:",
      "options": [
        {
          "letter": "A",
          "text": "Constant velocity"
        },
        {
          "letter": "B",
          "text": "Constant speed but changing velocity"
        },
        {
          "letter": "C",
          "text": "Zero acceleration"
        },
        {
          "letter": "D",
          "text": "Constant displacement"
        }
      ],
      "answer": "B",
      "explanation": "Speed is constant but direction changes continuously, so velocity changes and centripetal acceleration exists.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q032",
      "q": "The direction of centripetal acceleration in uniform circular motion is:",
      "options": [
        {
          "letter": "A",
          "text": "Tangential"
        },
        {
          "letter": "B",
          "text": "Away from the center"
        },
        {
          "letter": "C",
          "text": "Toward the center"
        },
        {
          "letter": "D",
          "text": "Along the velocity"
        }
      ],
      "answer": "C",
      "explanation": "Centripetal acceleration always points toward the center of the circle.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q033",
      "q": "The centripetal force required for circular motion of mass m, speed v, radius r is:",
      "options": [
        {
          "letter": "A",
          "text": "mv^2/r"
        },
        {
          "letter": "B",
          "text": "mvr"
        },
        {
          "letter": "C",
          "text": "mv/r^2"
        },
        {
          "letter": "D",
          "text": "mr/v^2"
        }
      ],
      "answer": "A",
      "explanation": "F = ma with a = v^2/r, so F = mv^2/r toward the center.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q034",
      "q": "If the speed of a body in circular motion is doubled, the centripetal force becomes:",
      "options": [
        {
          "letter": "A",
          "text": "Double"
        },
        {
          "letter": "B",
          "text": "Half"
        },
        {
          "letter": "C",
          "text": "Four times"
        },
        {
          "letter": "D",
          "text": "Unchanged"
        }
      ],
      "answer": "C",
      "explanation": "F = mv^2/r, so doubling v multiplies F by 4. EduNexus",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q035",
      "q": "Angular velocity is measured in:",
      "options": [
        {
          "letter": "A",
          "text": "m/s"
        },
        {
          "letter": "B",
          "text": "rad/s"
        },
        {
          "letter": "C",
          "text": "rev"
        },
        {
          "letter": "D",
          "text": "m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "Angular velocity = angle/time, unit radian per second.",
      "lectures": [
        11
      ],
      "concept": "angular-motion",
      "repeated": true
    },
    {
      "id": "Q036",
      "q": "The relation between linear velocity v and angular velocity omega is:",
      "options": [
        {
          "letter": "A",
          "text": "v = omega/r"
        },
        {
          "letter": "B",
          "text": "v = r x omega"
        },
        {
          "letter": "C",
          "text": "v = r^2 omega"
        },
        {
          "letter": "D",
          "text": "v = omega^2 r"
        }
      ],
      "answer": "B",
      "explanation": "For circular motion, v = r omega (tangential speed).",
      "lectures": [
        11
      ],
      "concept": "angular-motion",
      "repeated": true
    },
    {
      "id": "Q037",
      "q": "A wheel of radius 0.5 m rotates at 4 rad/s. The linear speed of a point on its rim is:",
      "options": [
        {
          "letter": "A",
          "text": "8 m/s"
        },
        {
          "letter": "B",
          "text": "2 m/s"
        },
        {
          "letter": "C",
          "text": "0.5 m/s"
        },
        {
          "letter": "D",
          "text": "4 m/s"
        }
      ],
      "answer": "B",
      "explanation": "v = r omega = 0.5 x 4 = 2 m/s.",
      "lectures": [
        11
      ],
      "concept": "angular-motion",
      "repeated": true
    },
    {
      "id": "Q038",
      "q": "Free fall of a body near Earth's surface is an example of:",
      "options": [
        {
          "letter": "A",
          "text": "Uniform velocity"
        },
        {
          "letter": "B",
          "text": "Uniformly accelerated motion"
        },
        {
          "letter": "C",
          "text": "Circular motion"
        },
        {
          "letter": "D",
          "text": "Simple harmonic motion"
        }
      ],
      "answer": "B",
      "explanation": "A freely falling body accelerates downward at constant g = 9.8 m/s^2. EduNexus",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q039",
      "q": "Galileo's conclusion about falling bodies was that:",
      "options": [
        {
          "letter": "A",
          "text": "Heavier bodies fall faster"
        },
        {
          "letter": "B",
          "text": "All bodies fall with the same acceleration in vacuum"
        },
        {
          "letter": "C",
          "text": "Air has no effect"
        },
        {
          "letter": "D",
          "text": "Mass affects acceleration"
        }
      ],
      "answer": "B",
      "explanation": "In the absence of air resistance, all objects fall with the same acceleration g.",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q040",
      "q": "A car accelerates from 10 m/s to 30 m/s in 4 s. Its acceleration is:",
      "options": [
        {
          "letter": "A",
          "text": "2.5 m/s^2"
        },
        {
          "letter": "B",
          "text": "5 m/s^2"
        },
        {
          "letter": "C",
          "text": "10 m/s^2"
        },
        {
          "letter": "D",
          "text": "7.5 m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "a = (v - u)/t = (30 - 10)/4 = 5 m/s^2.",
      "lectures": [
        3
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q041",
      "q": "Which of the following graphs represents uniform acceleration?",
      "options": [
        {
          "letter": "A",
          "text": "Horizontal line on v-t graph"
        },
        {
          "letter": "B",
          "text": "Straight inclined line on v-t graph"
        },
        {
          "letter": "C",
          "text": "Curved line on s-t graph only"
        },
        {
          "letter": "D",
          "text": "Horizontal line on a-t graph only"
        }
      ],
      "answer": "B",
      "explanation": "Uniform acceleration means velocity changes at a constant rate: a straight sloped line on the v-t graph.",
      "lectures": [
        2
      ],
      "concept": "motion-graphs",
      "repeated": false
    },
    {
      "id": "Q042",
      "q": "Retardation means:",
      "options": [
        {
          "letter": "A",
          "text": "Increase in speed"
        },
        {
          "letter": "B",
          "text": "Decrease in speed"
        },
        {
          "letter": "C",
          "text": "Constant speed"
        },
        {
          "letter": "D",
          "text": "Zero velocity"
        }
      ],
      "answer": "B",
      "explanation": "Retardation (deceleration) is negative acceleration, i.e. speed decreasing.",
      "lectures": [
        2
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q043",
      "q": "The SI unit of angular displacement is:",
      "options": [
        {
          "letter": "A",
          "text": "Degree"
        },
        {
          "letter": "B",
          "text": "Radian"
        },
        {
          "letter": "C",
          "text": "Revolution"
        },
        {
          "letter": "D",
          "text": "Meter"
        }
      ],
      "answer": "B",
      "explanation": "The SI unit of angle is the radian. EduNexus",
      "lectures": [
        11
      ],
      "concept": "angular-motion",
      "repeated": true
    },
    {
      "id": "Q044",
      "q": "One complete revolution equals:",
      "options": [
        {
          "letter": "A",
          "text": "pi radians"
        },
        {
          "letter": "B",
          "text": "2 pi radians"
        },
        {
          "letter": "C",
          "text": "180 radians"
        },
        {
          "letter": "D",
          "text": "360 radians"
        }
      ],
      "answer": "B",
      "explanation": "A full circle subtends 2 pi radians at the center.",
      "lectures": [
        11
      ],
      "concept": "angular-motion",
      "repeated": true
    },
    {
      "id": "Q045",
      "q": "The average velocity of a body that returns to its starting point is:",
      "options": [
        {
          "letter": "A",
          "text": "Equal to average speed"
        },
        {
          "letter": "B",
          "text": "Zero"
        },
        {
          "letter": "C",
          "text": "Maximum"
        },
        {
          "letter": "D",
          "text": "Negative"
        }
      ],
      "answer": "B",
      "explanation": "Displacement is zero for a round trip, so average velocity = 0/time = 0.",
      "lectures": [
        2
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q046",
      "q": "Instantaneous velocity is defined as:",
      "options": [
        {
          "letter": "A",
          "text": "Total distance / total time"
        },
        {
          "letter": "B",
          "text": "Limit of average velocity as time interval approaches zero"
        },
        {
          "letter": "C",
          "text": "Displacement x time"
        },
        {
          "letter": "D",
          "text": "Half of average velocity"
        }
      ],
      "answer": "B",
      "explanation": "Instantaneous velocity is the derivative of displacement with respect to time.",
      "lectures": [
        2
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q047",
      "q": "A bullet is fired horizontally and another is dropped from the same height at the same instant. Which hits the ground first?",
      "options": [
        {
          "letter": "A",
          "text": "The fired bullet"
        },
        {
          "letter": "B",
          "text": "The dropped bullet"
        },
        {
          "letter": "C",
          "text": "Both at the same time"
        },
        {
          "letter": "D",
          "text": "Depends on mass"
        }
      ],
      "answer": "C",
      "explanation": "Vertical motion is identical for both (same initial vertical velocity = 0), so they land together. EduNexus",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q048",
      "q": "The trajectory of a projectile (ignoring air resistance) is:",
      "options": [
        {
          "letter": "A",
          "text": "A straight line"
        },
        {
          "letter": "B",
          "text": "A parabola"
        },
        {
          "letter": "C",
          "text": "A circle"
        },
        {
          "letter": "D",
          "text": "A hyperbola"
        }
      ],
      "answer": "B",
      "explanation": "Constant horizontal velocity plus uniformly accelerated vertical motion traces a parabola.",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q049",
      "q": "At the top of its trajectory, a projectile has:",
      "options": [
        {
          "letter": "A",
          "text": "Zero velocity"
        },
        {
          "letter": "B",
          "text": "Only horizontal velocity"
        },
        {
          "letter": "C",
          "text": "Only vertical velocity"
        },
        {
          "letter": "D",
          "text": "Maximum speed"
        }
      ],
      "answer": "B",
      "explanation": "Vertical velocity is zero at the top; the horizontal component remains.",
      "lectures": [
        3
      ],
      "concept": "projectile",
      "repeated": true
    },
    {
      "id": "Q050",
      "q": "Which of the following is NOT a vector?",
      "options": [
        {
          "letter": "A",
          "text": "Weight"
        },
        {
          "letter": "B",
          "text": "Momentum"
        },
        {
          "letter": "C",
          "text": "Work"
        },
        {
          "letter": "D",
          "text": "Torque"
        }
      ],
      "answer": "C",
      "explanation": "Work = F . d is a scalar (dot product). Weight, momentum and torque are vectors.",
      "lectures": [
        1
      ],
      "concept": "scalar-vector",
      "repeated": true
    },
    {
      "id": "Q051",
      "q": "The resultant of two equal vectors acting at 120 degrees to each other has magnitude:",
      "options": [
        {
          "letter": "A",
          "text": "Double of each"
        },
        {
          "letter": "B",
          "text": "Equal to each vector"
        },
        {
          "letter": "C",
          "text": "Zero"
        },
        {
          "letter": "D",
          "text": "Half of each"
        }
      ],
      "answer": "B",
      "explanation": "R = sqrt(A^2 + A^2 + 2A^2 cos120) = sqrt(2A^2 - A^2) = A.",
      "lectures": [
        2
      ],
      "concept": "vector-addition",
      "repeated": false
    },
    {
      "id": "Q052",
      "q": "Unit vector along x-axis is denoted by:",
      "options": [
        {
          "letter": "A",
          "text": "j"
        },
        {
          "letter": "B",
          "text": "i"
        },
        {
          "letter": "C",
          "text": "k"
        },
        {
          "letter": "D",
          "text": "n"
        }
      ],
      "answer": "B",
      "explanation": "i, j, k are unit vectors along x, y, z axes respectively. EduNexus",
      "lectures": [
        2
      ],
      "concept": "vector-components",
      "repeated": false
    },
    {
      "id": "Q053",
      "q": "A physical quantity having magnitude, direction AND following vector addition laws is called:",
      "options": [
        {
          "letter": "A",
          "text": "Scalar"
        },
        {
          "letter": "B",
          "text": "Vector"
        },
        {
          "letter": "C",
          "text": "Tensor only"
        },
        {
          "letter": "D",
          "text": "Dimensionless"
        }
      ],
      "answer": "B",
      "explanation": "Vectors must obey the triangle/parallelogram law of addition.",
      "lectures": [
        1
      ],
      "concept": "scalar-vector",
      "repeated": true
    },
    {
      "id": "Q054",
      "q": "Current is a ____ quantity even though it has direction.",
      "options": [
        {
          "letter": "A",
          "text": "Vector"
        },
        {
          "letter": "B",
          "text": "Scalar"
        },
        {
          "letter": "C",
          "text": "Tensor"
        },
        {
          "letter": "D",
          "text": "Derived vector"
        }
      ],
      "answer": "B",
      "explanation": "Electric current does not follow vector addition laws at a junction, so it is treated as a scalar.",
      "lectures": [
        1
      ],
      "concept": "scalar-vector",
      "repeated": true
    },
    {
      "id": "Q055",
      "q": "Dimensional analysis can be used to:",
      "options": [
        {
          "letter": "A",
          "text": "Find exact constants"
        },
        {
          "letter": "B",
          "text": "Check correctness of an equation"
        },
        {
          "letter": "C",
          "text": "Measure length"
        },
        {
          "letter": "D",
          "text": "Find direction"
        }
      ],
      "answer": "B",
      "explanation": "Dimensions must match on both sides of a valid equation; dimensional analysis checks homogeneity but not dimensionless constants.",
      "lectures": [
        1
      ],
      "concept": "dimensions",
      "repeated": false
    },
    {
      "id": "Q056",
      "q": "Which equation is dimensionally correct?",
      "options": [
        {
          "letter": "A",
          "text": "s = ut + at"
        },
        {
          "letter": "B",
          "text": "v^2 = u^2 + 2as^2"
        },
        {
          "letter": "C",
          "text": "F = mv"
        },
        {
          "letter": "D",
          "text": "P = Fv"
        }
      ],
      "answer": "D",
      "explanation": "Power = force x velocity: [M L T^-2][L T^-1] = [M L^2 T^-3], correct for power. EduNexus",
      "lectures": [
        1
      ],
      "concept": "dimensions",
      "repeated": false
    },
    {
      "id": "Q057",
      "q": "The least count of a vernier caliper is typically:",
      "options": [
        {
          "letter": "A",
          "text": "1 mm"
        },
        {
          "letter": "B",
          "text": "0.1 mm"
        },
        {
          "letter": "C",
          "text": "0.01 mm"
        },
        {
          "letter": "D",
          "text": "1 cm"
        }
      ],
      "answer": "B",
      "explanation": "A standard vernier caliper has a least count of 0.1 mm (0.01 cm).",
      "lectures": [
        1
      ],
      "concept": "measurement-errors",
      "repeated": false
    },
    {
      "id": "Q058",
      "q": "Screw gauge is used to measure:",
      "options": [
        {
          "letter": "A",
          "text": "Large distances"
        },
        {
          "letter": "B",
          "text": "Very small lengths like wire diameter"
        },
        {
          "letter": "C",
          "text": "Mass"
        },
        {
          "letter": "D",
          "text": "Time"
        }
      ],
      "answer": "B",
      "explanation": "A screw gauge (micrometer) measures small lengths with least count 0.01 mm.",
      "lectures": [
        1
      ],
      "concept": "measurement-errors",
      "repeated": false
    },
    {
      "id": "Q059",
      "q": "Zero error in a measuring instrument causes:",
      "options": [
        {
          "letter": "A",
          "text": "Random error"
        },
        {
          "letter": "B",
          "text": "Systematic error"
        },
        {
          "letter": "C",
          "text": "No error"
        },
        {
          "letter": "D",
          "text": "Personal error"
        }
      ],
      "answer": "B",
      "explanation": "Zero error shifts every reading by a fixed amount, a systematic error.",
      "lectures": [
        1
      ],
      "concept": "measurement-errors",
      "repeated": false
    },
    {
      "id": "Q060",
      "q": "Parallax error can be avoided by:",
      "options": [
        {
          "letter": "A",
          "text": "Using a better scale"
        },
        {
          "letter": "B",
          "text": "Reading with the eye directly above the mark"
        },
        {
          "letter": "C",
          "text": "Zeroing the instrument"
        },
        {
          "letter": "D",
          "text": "Taking more readings"
        }
      ],
      "answer": "B",
      "explanation": "Parallax error comes from viewing angle; keeping the eye perpendicular to the scale avoids it.",
      "lectures": [
        1
      ],
      "concept": "measurement-errors",
      "repeated": false
    },
    {
      "id": "Q061",
      "q": "Newton's first law of motion is also called the law of:",
      "options": [
        {
          "letter": "A",
          "text": "Action-reaction"
        },
        {
          "letter": "B",
          "text": "Inertia"
        },
        {
          "letter": "C",
          "text": "Gravitation"
        },
        {
          "letter": "D",
          "text": "Momentum"
        }
      ],
      "answer": "B",
      "explanation": "The first law states a body keeps its state of rest or uniform motion unless acted upon, the law of inertia. EduNexus",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q062",
      "q": "Newton's second law of motion gives:",
      "options": [
        {
          "letter": "A",
          "text": "Definition of force"
        },
        {
          "letter": "B",
          "text": "Definition of inertia"
        },
        {
          "letter": "C",
          "text": "Relation between action and reaction"
        },
        {
          "letter": "D",
          "text": "Conservation of energy"
        }
      ],
      "answer": "A",
      "explanation": "F = ma defines force quantitatively in terms of mass and acceleration.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q063",
      "q": "Newton's third law states:",
      "options": [
        {
          "letter": "A",
          "text": "F = ma"
        },
        {
          "letter": "B",
          "text": "Every action has an equal and opposite reaction"
        },
        {
          "letter": "C",
          "text": "A body remains at rest"
        },
        {
          "letter": "D",
          "text": "Energy is conserved"
        }
      ],
      "answer": "B",
      "explanation": "Action and reaction are equal in magnitude, opposite in direction, acting on different bodies.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q064",
      "q": "The SI unit of momentum is:",
      "options": [
        {
          "letter": "A",
          "text": "kg m/s"
        },
        {
          "letter": "B",
          "text": "N s^2"
        },
        {
          "letter": "C",
          "text": "kg m/s^2"
        },
        {
          "letter": "D",
          "text": "J s"
        }
      ],
      "answer": "A",
      "explanation": "Momentum p = mv, so its unit is kg m/s (also N s).",
      "lectures": [
        9
      ],
      "concept": "momentum",
      "repeated": false
    },
    {
      "id": "Q065",
      "q": "A force of 10 N acts on a 2 kg mass. The acceleration produced is:",
      "options": [
        {
          "letter": "A",
          "text": "20 m/s^2"
        },
        {
          "letter": "B",
          "text": "5 m/s^2"
        },
        {
          "letter": "C",
          "text": "0.2 m/s^2"
        },
        {
          "letter": "D",
          "text": "12 m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "a = F/m = 10/2 = 5 m/s^2.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q066",
      "q": "Inertia of a body depends on its:",
      "options": [
        {
          "letter": "A",
          "text": "Velocity"
        },
        {
          "letter": "B",
          "text": "Mass"
        },
        {
          "letter": "C",
          "text": "Acceleration"
        },
        {
          "letter": "D",
          "text": "Shape only"
        }
      ],
      "answer": "B",
      "explanation": "Greater mass means greater resistance to change in motion, i.e. greater inertia. EduNexus",
      "lectures": [
        4
      ],
      "concept": "inertia",
      "repeated": false
    },
    {
      "id": "Q067",
      "q": "A passenger lurches forward when a bus stops suddenly due to:",
      "options": [
        {
          "letter": "A",
          "text": "Action-reaction"
        },
        {
          "letter": "B",
          "text": "Inertia of motion"
        },
        {
          "letter": "C",
          "text": "Friction"
        },
        {
          "letter": "D",
          "text": "Gravity"
        }
      ],
      "answer": "B",
      "explanation": "The body tends to continue moving forward (inertia of motion) while the bus stops.",
      "lectures": [
        4
      ],
      "concept": "inertia",
      "repeated": false
    },
    {
      "id": "Q068",
      "q": "Static friction is:",
      "options": [
        {
          "letter": "A",
          "text": "Always greater than kinetic friction"
        },
        {
          "letter": "B",
          "text": "Equal to applied force up to a maximum limit"
        },
        {
          "letter": "C",
          "text": "Always zero"
        },
        {
          "letter": "D",
          "text": "Independent of surfaces"
        }
      ],
      "answer": "B",
      "explanation": "Static friction self-adjusts to match the applied force until the limiting value mu_s N is reached.",
      "lectures": [
        5
      ],
      "concept": "friction",
      "repeated": true
    },
    {
      "id": "Q069",
      "q": "The coefficient of kinetic friction is generally ____ the coefficient of static friction.",
      "options": [
        {
          "letter": "A",
          "text": "Greater than"
        },
        {
          "letter": "B",
          "text": "Equal to"
        },
        {
          "letter": "C",
          "text": "Less than"
        },
        {
          "letter": "D",
          "text": "Unrelated to"
        }
      ],
      "answer": "C",
      "explanation": "It takes more force to start motion than to keep it going: mu_k < mu_s.",
      "lectures": [
        5
      ],
      "concept": "friction",
      "repeated": true
    },
    {
      "id": "Q070",
      "q": "Friction opposes:",
      "options": [
        {
          "letter": "A",
          "text": "Applied force"
        },
        {
          "letter": "B",
          "text": "Relative motion between surfaces"
        },
        {
          "letter": "C",
          "text": "Gravity"
        },
        {
          "letter": "D",
          "text": "Normal reaction"
        }
      ],
      "answer": "B",
      "explanation": "Friction always acts to oppose relative motion (or the tendency of motion) between contacting surfaces. EduNexus",
      "lectures": [
        5
      ],
      "concept": "friction",
      "repeated": true
    },
    {
      "id": "Q071",
      "q": "The normal reaction on a block on a horizontal surface equals:",
      "options": [
        {
          "letter": "A",
          "text": "Its mass"
        },
        {
          "letter": "B",
          "text": "Its weight"
        },
        {
          "letter": "C",
          "text": "Applied force"
        },
        {
          "letter": "D",
          "text": "Friction"
        }
      ],
      "answer": "B",
      "explanation": "For a horizontal surface with no vertical forces, N = mg = weight.",
      "lectures": [
        5
      ],
      "concept": "normal-reaction",
      "repeated": false
    },
    {
      "id": "Q072",
      "q": "A 5 kg block is pulled with 20 N on a frictionless surface. Its acceleration is:",
      "options": [
        {
          "letter": "A",
          "text": "100 m/s^2"
        },
        {
          "letter": "B",
          "text": "4 m/s^2"
        },
        {
          "letter": "C",
          "text": "0.25 m/s^2"
        },
        {
          "letter": "D",
          "text": "25 m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "a = F/m = 20/5 = 4 m/s^2.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q073",
      "q": "The weight of a 10 kg mass on Earth (g = 10 m/s^2) is:",
      "options": [
        {
          "letter": "A",
          "text": "10 N"
        },
        {
          "letter": "B",
          "text": "100 N"
        },
        {
          "letter": "C",
          "text": "1 N"
        },
        {
          "letter": "D",
          "text": "1000 N"
        }
      ],
      "answer": "B",
      "explanation": "W = mg = 10 x 10 = 100 N.",
      "lectures": [
        4
      ],
      "concept": "mass-weight",
      "repeated": true
    },
    {
      "id": "Q074",
      "q": "Mass and weight differ because:",
      "options": [
        {
          "letter": "A",
          "text": "Mass is a force"
        },
        {
          "letter": "B",
          "text": "Weight depends on gravity, mass does not"
        },
        {
          "letter": "C",
          "text": "Weight is constant everywhere"
        },
        {
          "letter": "D",
          "text": "Mass changes on the Moon"
        }
      ],
      "answer": "B",
      "explanation": "Mass is intrinsic matter content; weight = mg varies with local gravity.",
      "lectures": [
        4
      ],
      "concept": "mass-weight",
      "repeated": true
    },
    {
      "id": "Q075",
      "q": "A body is in equilibrium when:",
      "options": [
        {
          "letter": "A",
          "text": "It is at rest only"
        },
        {
          "letter": "B",
          "text": "Net force and net torque on it are zero"
        },
        {
          "letter": "C",
          "text": "It moves with acceleration"
        },
        {
          "letter": "D",
          "text": "Only one force acts"
        }
      ],
      "answer": "B",
      "explanation": "Translational equilibrium needs net F = 0; rotational equilibrium needs net torque = 0. EduNexus",
      "lectures": [
        14
      ],
      "concept": "equilibrium",
      "repeated": false
    },
    {
      "id": "Q076",
      "q": "Tension in a string supporting a stationary mass m is:",
      "options": [
        {
          "letter": "A",
          "text": "Zero"
        },
        {
          "letter": "B",
          "text": "mg"
        },
        {
          "letter": "C",
          "text": "2mg"
        },
        {
          "letter": "D",
          "text": "mg/2"
        }
      ],
      "answer": "B",
      "explanation": "For equilibrium, upward tension balances downward weight: T = mg.",
      "lectures": [
        5
      ],
      "concept": "tension",
      "repeated": false
    },
    {
      "id": "Q077",
      "q": "Work is done when:",
      "options": [
        {
          "letter": "A",
          "text": "Force is applied"
        },
        {
          "letter": "B",
          "text": "Force causes displacement in its direction"
        },
        {
          "letter": "C",
          "text": "Body is at rest"
        },
        {
          "letter": "D",
          "text": "Force is perpendicular to displacement"
        }
      ],
      "answer": "B",
      "explanation": "W = F d cos(theta); no displacement (or perpendicular force) means no work.",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q078",
      "q": "The SI unit of work is the same as that of:",
      "options": [
        {
          "letter": "A",
          "text": "Power"
        },
        {
          "letter": "B",
          "text": "Energy"
        },
        {
          "letter": "C",
          "text": "Force"
        },
        {
          "letter": "D",
          "text": "Momentum"
        }
      ],
      "answer": "B",
      "explanation": "Work and energy share the joule (J) as SI unit.",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q079",
      "q": "Work done by a force perpendicular to displacement is:",
      "options": [
        {
          "letter": "A",
          "text": "Maximum"
        },
        {
          "letter": "B",
          "text": "Zero"
        },
        {
          "letter": "C",
          "text": "Negative"
        },
        {
          "letter": "D",
          "text": "Infinite"
        }
      ],
      "answer": "B",
      "explanation": "W = Fd cos 90 = 0.",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q080",
      "q": "A 10 N force moves a body 5 m in the direction of the force. Work done is:",
      "options": [
        {
          "letter": "A",
          "text": "2 J"
        },
        {
          "letter": "B",
          "text": "15 J"
        },
        {
          "letter": "C",
          "text": "50 J"
        },
        {
          "letter": "D",
          "text": "0.5 J"
        }
      ],
      "answer": "C",
      "explanation": "W = F x d = 10 x 5 = 50 J. EduNexus",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q081",
      "q": "Kinetic energy of a 2 kg body moving at 3 m/s is:",
      "options": [
        {
          "letter": "A",
          "text": "6 J"
        },
        {
          "letter": "B",
          "text": "9 J"
        },
        {
          "letter": "C",
          "text": "12 J"
        },
        {
          "letter": "D",
          "text": "18 J"
        }
      ],
      "answer": "B",
      "explanation": "KE = (1/2)mv^2 = 0.5 x 2 x 9 = 9 J.",
      "lectures": [
        7
      ],
      "concept": "kinetic-energy",
      "repeated": true
    },
    {
      "id": "Q082",
      "q": "If the speed of a body is doubled, its kinetic energy becomes:",
      "options": [
        {
          "letter": "A",
          "text": "Double"
        },
        {
          "letter": "B",
          "text": "Four times"
        },
        {
          "letter": "C",
          "text": "Half"
        },
        {
          "letter": "D",
          "text": "Eight times"
        }
      ],
      "answer": "B",
      "explanation": "KE is proportional to v^2, so doubling speed quadruples KE.",
      "lectures": [
        7
      ],
      "concept": "kinetic-energy",
      "repeated": true
    },
    {
      "id": "Q083",
      "q": "Potential energy of a 5 kg mass raised 4 m (g = 10 m/s^2) is:",
      "options": [
        {
          "letter": "A",
          "text": "20 J"
        },
        {
          "letter": "B",
          "text": "200 J"
        },
        {
          "letter": "C",
          "text": "9 J"
        },
        {
          "letter": "D",
          "text": "45 J"
        }
      ],
      "answer": "B",
      "explanation": "PE = mgh = 5 x 10 x 4 = 200 J.",
      "lectures": [
        7
      ],
      "concept": "potential-energy",
      "repeated": false
    },
    {
      "id": "Q084",
      "q": "The work-energy theorem states that work done by net force equals:",
      "options": [
        {
          "letter": "A",
          "text": "Change in potential energy"
        },
        {
          "letter": "B",
          "text": "Change in kinetic energy"
        },
        {
          "letter": "C",
          "text": "Change in momentum"
        },
        {
          "letter": "D",
          "text": "Power"
        }
      ],
      "answer": "B",
      "explanation": "W_net = KE_final - KE_initial.",
      "lectures": [
        7
      ],
      "concept": "work-energy-theorem",
      "repeated": true
    },
    {
      "id": "Q085",
      "q": "Power is defined as:",
      "options": [
        {
          "letter": "A",
          "text": "Force x distance"
        },
        {
          "letter": "B",
          "text": "Work done per unit time"
        },
        {
          "letter": "C",
          "text": "Energy x time"
        },
        {
          "letter": "D",
          "text": "Force / time"
        }
      ],
      "answer": "B",
      "explanation": "P = W/t, SI unit watt (J/s). EduNexus",
      "lectures": [
        7
      ],
      "concept": "power",
      "repeated": true
    },
    {
      "id": "Q086",
      "q": "1 horsepower is approximately equal to:",
      "options": [
        {
          "letter": "A",
          "text": "746 W"
        },
        {
          "letter": "B",
          "text": "1000 W"
        },
        {
          "letter": "C",
          "text": "100 W"
        },
        {
          "letter": "D",
          "text": "550 W"
        }
      ],
      "answer": "A",
      "explanation": "1 hp = 746 watts.",
      "lectures": [
        7
      ],
      "concept": "power",
      "repeated": true
    },
    {
      "id": "Q087",
      "q": "A machine does 1000 J of work in 20 s. Its power is:",
      "options": [
        {
          "letter": "A",
          "text": "20000 W"
        },
        {
          "letter": "B",
          "text": "50 W"
        },
        {
          "letter": "C",
          "text": "500 W"
        },
        {
          "letter": "D",
          "text": "20 W"
        }
      ],
      "answer": "B",
      "explanation": "P = 1000/20 = 50 W.",
      "lectures": [
        7
      ],
      "concept": "power",
      "repeated": true
    },
    {
      "id": "Q088",
      "q": "Conservation of mechanical energy holds when:",
      "options": [
        {
          "letter": "A",
          "text": "Friction acts"
        },
        {
          "letter": "B",
          "text": "Only conservative forces do work"
        },
        {
          "letter": "C",
          "text": "External force acts"
        },
        {
          "letter": "D",
          "text": "Mass changes"
        }
      ],
      "answer": "B",
      "explanation": "With only conservative forces (like gravity), KE + PE stays constant.",
      "lectures": [
        8
      ],
      "concept": "energy-conservation",
      "repeated": true
    },
    {
      "id": "Q089",
      "q": "A falling body converts:",
      "options": [
        {
          "letter": "A",
          "text": "Kinetic energy into potential energy"
        },
        {
          "letter": "B",
          "text": "Potential energy into kinetic energy"
        },
        {
          "letter": "C",
          "text": "Heat into work"
        },
        {
          "letter": "D",
          "text": "Mass into energy"
        }
      ],
      "answer": "B",
      "explanation": "As height decreases, mgh decreases and (1/2)mv^2 increases.",
      "lectures": [
        8
      ],
      "concept": "energy-conservation",
      "repeated": true
    },
    {
      "id": "Q090",
      "q": "Elastic potential energy is stored in:",
      "options": [
        {
          "letter": "A",
          "text": "A raised weight"
        },
        {
          "letter": "B",
          "text": "A stretched spring"
        },
        {
          "letter": "C",
          "text": "A moving car"
        },
        {
          "letter": "D",
          "text": "A hot body"
        }
      ],
      "answer": "B",
      "explanation": "A deformed elastic body like a stretched spring stores (1/2)kx^2. EduNexus",
      "lectures": [
        8
      ],
      "concept": "potential-energy",
      "repeated": false
    },
    {
      "id": "Q091",
      "q": "Impulse is equal to:",
      "options": [
        {
          "letter": "A",
          "text": "Change in kinetic energy"
        },
        {
          "letter": "B",
          "text": "Change in momentum"
        },
        {
          "letter": "C",
          "text": "Force x distance"
        },
        {
          "letter": "D",
          "text": "Mass x acceleration"
        }
      ],
      "answer": "B",
      "explanation": "Impulse J = F x t = change in momentum (delta p).",
      "lectures": [
        9
      ],
      "concept": "impulse",
      "repeated": true
    },
    {
      "id": "Q092",
      "q": "The SI unit of impulse is:",
      "options": [
        {
          "letter": "A",
          "text": "Joule"
        },
        {
          "letter": "B",
          "text": "Newton second"
        },
        {
          "letter": "C",
          "text": "Watt"
        },
        {
          "letter": "D",
          "text": "Pascal"
        }
      ],
      "answer": "B",
      "explanation": "Impulse = F t, unit N s, same as kg m/s.",
      "lectures": [
        9
      ],
      "concept": "impulse",
      "repeated": true
    },
    {
      "id": "Q093",
      "q": "In an elastic collision:",
      "options": [
        {
          "letter": "A",
          "text": "Only momentum is conserved"
        },
        {
          "letter": "B",
          "text": "Both momentum and kinetic energy are conserved"
        },
        {
          "letter": "C",
          "text": "Only kinetic energy is conserved"
        },
        {
          "letter": "D",
          "text": "Neither is conserved"
        }
      ],
      "answer": "B",
      "explanation": "Elastic collisions conserve total momentum and total kinetic energy.",
      "lectures": [
        10
      ],
      "concept": "collisions",
      "repeated": true
    },
    {
      "id": "Q094",
      "q": "In an inelastic collision:",
      "options": [
        {
          "letter": "A",
          "text": "Kinetic energy is conserved"
        },
        {
          "letter": "B",
          "text": "Momentum is conserved but kinetic energy is not"
        },
        {
          "letter": "C",
          "text": "Neither momentum nor energy is conserved"
        },
        {
          "letter": "D",
          "text": "Mass is lost"
        }
      ],
      "answer": "B",
      "explanation": "Momentum is always conserved in collisions; KE is partly converted to heat/sound in inelastic ones. EduNexus",
      "lectures": [
        10
      ],
      "concept": "collisions",
      "repeated": true
    },
    {
      "id": "Q095",
      "q": "A 2 kg object moving at 4 m/s collides and sticks to a stationary 2 kg object. Their common speed is:",
      "options": [
        {
          "letter": "A",
          "text": "4 m/s"
        },
        {
          "letter": "B",
          "text": "2 m/s"
        },
        {
          "letter": "C",
          "text": "8 m/s"
        },
        {
          "letter": "D",
          "text": "1 m/s"
        }
      ],
      "answer": "B",
      "explanation": "Momentum: 2x4 = 4v, so v = 2 m/s (perfectly inelastic).",
      "lectures": [
        10
      ],
      "concept": "collisions",
      "repeated": true
    },
    {
      "id": "Q096",
      "q": "Recoil of a gun is explained by:",
      "options": [
        {
          "letter": "A",
          "text": "Conservation of energy"
        },
        {
          "letter": "B",
          "text": "Conservation of momentum"
        },
        {
          "letter": "C",
          "text": "Newton's first law"
        },
        {
          "letter": "D",
          "text": "Friction"
        }
      ],
      "answer": "B",
      "explanation": "Initially zero momentum: bullet's forward momentum equals gun's backward momentum.",
      "lectures": [
        9
      ],
      "concept": "momentum-conservation",
      "repeated": true
    },
    {
      "id": "Q097",
      "q": "A 1000 kg car moving at 20 m/s has momentum:",
      "options": [
        {
          "letter": "A",
          "text": "50 kg m/s"
        },
        {
          "letter": "B",
          "text": "20000 kg m/s"
        },
        {
          "letter": "C",
          "text": "500 kg m/s"
        },
        {
          "letter": "D",
          "text": "2000 kg m/s"
        }
      ],
      "answer": "B",
      "explanation": "p = mv = 1000 x 20 = 20000 kg m/s.",
      "lectures": [
        9
      ],
      "concept": "momentum",
      "repeated": false
    },
    {
      "id": "Q098",
      "q": "Two bodies of equal mass collide elastically head-on with equal opposite velocities. After collision they:",
      "options": [
        {
          "letter": "A",
          "text": "Stick together"
        },
        {
          "letter": "B",
          "text": "Exchange velocities"
        },
        {
          "letter": "C",
          "text": "Stop"
        },
        {
          "letter": "D",
          "text": "Move with double speed"
        }
      ],
      "answer": "B",
      "explanation": "In an elastic collision of identical masses, the bodies exchange their velocities. EduNexus",
      "lectures": [
        10
      ],
      "concept": "collisions",
      "repeated": true
    },
    {
      "id": "Q099",
      "q": "The center of mass of a uniform rod lies at its:",
      "options": [
        {
          "letter": "A",
          "text": "One end"
        },
        {
          "letter": "B",
          "text": "Midpoint"
        },
        {
          "letter": "C",
          "text": "Quarter point"
        },
        {
          "letter": "D",
          "text": "Outside the rod"
        }
      ],
      "answer": "B",
      "explanation": "Symmetry puts the center of mass of a uniform rod at its geometric center.",
      "lectures": [
        12
      ],
      "concept": "centre-of-mass",
      "repeated": false
    },
    {
      "id": "Q100",
      "q": "Torque is the rotational analog of:",
      "options": [
        {
          "letter": "A",
          "text": "Mass"
        },
        {
          "letter": "B",
          "text": "Force"
        },
        {
          "letter": "C",
          "text": "Velocity"
        },
        {
          "letter": "D",
          "text": "Energy"
        }
      ],
      "answer": "B",
      "explanation": "Torque = r x F causes angular acceleration just as force causes linear acceleration.",
      "lectures": [
        11
      ],
      "concept": "torque",
      "repeated": true
    },
    {
      "id": "Q101",
      "q": "The SI unit of torque is:",
      "options": [
        {
          "letter": "A",
          "text": "Joule"
        },
        {
          "letter": "B",
          "text": "Newton meter"
        },
        {
          "letter": "C",
          "text": "Watt"
        },
        {
          "letter": "D",
          "text": "kg m/s"
        }
      ],
      "answer": "B",
      "explanation": "Torque = force x perpendicular distance: N m.",
      "lectures": [
        11
      ],
      "concept": "torque",
      "repeated": true
    },
    {
      "id": "Q102",
      "q": "Moment of inertia depends on:",
      "options": [
        {
          "letter": "A",
          "text": "Mass only"
        },
        {
          "letter": "B",
          "text": "Mass and its distribution about the axis"
        },
        {
          "letter": "C",
          "text": "Velocity"
        },
        {
          "letter": "D",
          "text": "Applied torque"
        }
      ],
      "answer": "B",
      "explanation": "I = sum(m r^2); how far mass is from the axis matters. EduNexus",
      "lectures": [
        11
      ],
      "concept": "moment-of-inertia",
      "repeated": true
    },
    {
      "id": "Q103",
      "q": "A hollow cylinder has ____ moment of inertia than a solid cylinder of the same mass and radius.",
      "options": [
        {
          "letter": "A",
          "text": "Smaller"
        },
        {
          "letter": "B",
          "text": "Greater"
        },
        {
          "letter": "C",
          "text": "Equal"
        },
        {
          "letter": "D",
          "text": "Zero"
        }
      ],
      "answer": "B",
      "explanation": "In a hollow cylinder all mass is at radius R (I = MR^2) versus (1/2)MR^2 for solid, so hollow is greater.",
      "lectures": [
        11
      ],
      "concept": "moment-of-inertia",
      "repeated": true
    },
    {
      "id": "Q104",
      "q": "Angular momentum is conserved when:",
      "options": [
        {
          "letter": "A",
          "text": "External torque is zero"
        },
        {
          "letter": "B",
          "text": "External force is zero"
        },
        {
          "letter": "C",
          "text": "Mass is constant"
        },
        {
          "letter": "D",
          "text": "Velocity is constant"
        }
      ],
      "answer": "A",
      "explanation": "dL/dt = torque_ext; with no external torque, L stays constant.",
      "lectures": [
        13
      ],
      "concept": "angular-momentum-conservation",
      "repeated": true
    },
    {
      "id": "Q105",
      "q": "An ice skater spins faster when pulling arms in because of:",
      "options": [
        {
          "letter": "A",
          "text": "Conservation of energy"
        },
        {
          "letter": "B",
          "text": "Conservation of angular momentum"
        },
        {
          "letter": "C",
          "text": "Increased torque"
        },
        {
          "letter": "D",
          "text": "Decreased friction"
        }
      ],
      "answer": "B",
      "explanation": "Pulling arms in reduces I; with L = I omega constant, omega increases.",
      "lectures": [
        13
      ],
      "concept": "angular-momentum-conservation",
      "repeated": true
    },
    {
      "id": "Q106",
      "q": "The relation between torque and angular acceleration is:",
      "options": [
        {
          "letter": "A",
          "text": "tau = I / alpha"
        },
        {
          "letter": "B",
          "text": "tau = I alpha"
        },
        {
          "letter": "C",
          "text": "tau = I omega"
        },
        {
          "letter": "D",
          "text": "tau = m alpha"
        }
      ],
      "answer": "B",
      "explanation": "Rotational form of Newton's second law: torque = I x alpha. EduNexus",
      "lectures": [
        13
      ],
      "concept": "torque",
      "repeated": true
    },
    {
      "id": "Q107",
      "q": "A wheel rolling without slipping has:",
      "options": [
        {
          "letter": "A",
          "text": "Only translational motion"
        },
        {
          "letter": "B",
          "text": "Only rotational motion"
        },
        {
          "letter": "C",
          "text": "Both translational and rotational motion"
        },
        {
          "letter": "D",
          "text": "No motion of center"
        }
      ],
      "answer": "C",
      "explanation": "Rolling = translation of center plus rotation about the center.",
      "lectures": [
        11
      ],
      "concept": "rolling",
      "repeated": true
    },
    {
      "id": "Q108",
      "q": "The kinetic energy of a rolling body includes:",
      "options": [
        {
          "letter": "A",
          "text": "Only translational KE"
        },
        {
          "letter": "B",
          "text": "Only rotational KE"
        },
        {
          "letter": "C",
          "text": "Both translational and rotational KE"
        },
        {
          "letter": "D",
          "text": "Only potential energy"
        }
      ],
      "answer": "C",
      "explanation": "Total KE = (1/2)mv^2 + (1/2)I omega^2.",
      "lectures": [
        11
      ],
      "concept": "rolling",
      "repeated": true
    },
    {
      "id": "Q109",
      "q": "For a body in uniform circular motion, work done by centripetal force in one revolution is:",
      "options": [
        {
          "letter": "A",
          "text": "2 pi r F"
        },
        {
          "letter": "B",
          "text": "F x r"
        },
        {
          "letter": "C",
          "text": "Zero"
        },
        {
          "letter": "D",
          "text": "mv^2"
        }
      ],
      "answer": "C",
      "explanation": "Centripetal force is always perpendicular to displacement, so work is zero.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q110",
      "q": "A force of 5 N applied at 2 m from the pivot, perpendicular to the lever arm, produces torque:",
      "options": [
        {
          "letter": "A",
          "text": "2.5 N m"
        },
        {
          "letter": "B",
          "text": "10 N m"
        },
        {
          "letter": "C",
          "text": "7 N m"
        },
        {
          "letter": "D",
          "text": "0.4 N m"
        }
      ],
      "answer": "B",
      "explanation": "tau = r F = 2 x 5 = 10 N m. EduNexus",
      "lectures": [
        11
      ],
      "concept": "torque",
      "repeated": true
    },
    {
      "id": "Q111",
      "q": "Which condition must hold for a see-saw to balance?",
      "options": [
        {
          "letter": "A",
          "text": "Equal masses"
        },
        {
          "letter": "B",
          "text": "Equal torques on both sides"
        },
        {
          "letter": "C",
          "text": "Equal forces"
        },
        {
          "letter": "D",
          "text": "Zero mass"
        }
      ],
      "answer": "B",
      "explanation": "Balance needs clockwise torque = anticlockwise torque about the pivot.",
      "lectures": [
        14
      ],
      "concept": "equilibrium",
      "repeated": false
    },
    {
      "id": "Q112",
      "q": "The gravitational force between two masses is:",
      "options": [
        {
          "letter": "A",
          "text": "Directly proportional to the product of masses"
        },
        {
          "letter": "B",
          "text": "Inversely proportional to masses"
        },
        {
          "letter": "C",
          "text": "Independent of distance"
        },
        {
          "letter": "D",
          "text": "Proportional to distance"
        }
      ],
      "answer": "A",
      "explanation": "F = G m1 m2 / r^2.",
      "lectures": [
        21
      ],
      "concept": "gravitation",
      "repeated": true
    },
    {
      "id": "Q113",
      "q": "The value of the universal gravitational constant G is approximately:",
      "options": [
        {
          "letter": "A",
          "text": "9.8 N m^2/kg^2"
        },
        {
          "letter": "B",
          "text": "6.67 x 10^-11 N m^2/kg^2"
        },
        {
          "letter": "C",
          "text": "6.02 x 10^23"
        },
        {
          "letter": "D",
          "text": "3 x 10^8"
        }
      ],
      "answer": "B",
      "explanation": "G = 6.67 x 10^-11 N m^2/kg^2.",
      "lectures": [
        21
      ],
      "concept": "gravitation",
      "repeated": true
    },
    {
      "id": "Q114",
      "q": "Acceleration due to gravity g ____ with altitude.",
      "options": [
        {
          "letter": "A",
          "text": "Increases"
        },
        {
          "letter": "B",
          "text": "Decreases"
        },
        {
          "letter": "C",
          "text": "Remains constant"
        },
        {
          "letter": "D",
          "text": "Becomes zero immediately"
        }
      ],
      "answer": "B",
      "explanation": "g = GM/r^2 decreases as distance from Earth's center increases. EduNexus",
      "lectures": [
        21
      ],
      "concept": "gravitation",
      "repeated": true
    },
    {
      "id": "Q115",
      "q": "A satellite in orbit is in a state of:",
      "options": [
        {
          "letter": "A",
          "text": "Rest"
        },
        {
          "letter": "B",
          "text": "Continuous free fall"
        },
        {
          "letter": "C",
          "text": "Uniform velocity"
        },
        {
          "letter": "D",
          "text": "Zero gravity"
        }
      ],
      "answer": "B",
      "explanation": "The satellite constantly falls toward Earth but its tangential motion keeps it in orbit (weightlessness).",
      "lectures": [
        21
      ],
      "concept": "satellites",
      "repeated": false
    },
    {
      "id": "Q116",
      "q": "Escape velocity from Earth is approximately:",
      "options": [
        {
          "letter": "A",
          "text": "7.9 km/s"
        },
        {
          "letter": "B",
          "text": "11.2 km/s"
        },
        {
          "letter": "C",
          "text": "3 x 10^8 m/s"
        },
        {
          "letter": "D",
          "text": "9.8 km/s"
        }
      ],
      "answer": "B",
      "explanation": "v_escape = sqrt(2gR) approx 11.2 km/s for Earth.",
      "lectures": [
        21
      ],
      "concept": "gravitation",
      "repeated": true
    },
    {
      "id": "Q117",
      "q": "The first artificial satellite launched into space was:",
      "options": [
        {
          "letter": "A",
          "text": "Explorer 1"
        },
        {
          "letter": "B",
          "text": "Sputnik 1"
        },
        {
          "letter": "C",
          "text": "Apollo 11"
        },
        {
          "letter": "D",
          "text": "Voyager 1"
        }
      ],
      "answer": "B",
      "explanation": "Sputnik 1 was launched by the USSR on 4 October 1957.",
      "lectures": [
        21
      ],
      "concept": "satellites",
      "repeated": false
    },
    {
      "id": "Q118",
      "q": "Geostationary satellites orbit at a height of about:",
      "options": [
        {
          "letter": "A",
          "text": "360 km"
        },
        {
          "letter": "B",
          "text": "3600 km"
        },
        {
          "letter": "C",
          "text": "36000 km"
        },
        {
          "letter": "D",
          "text": "360000 km"
        }
      ],
      "answer": "C",
      "explanation": "Geostationary orbit is ~35,786 km above the equator (about 36000 km).",
      "lectures": [
        21
      ],
      "concept": "satellites",
      "repeated": false
    },
    {
      "id": "Q119",
      "q": "The orbital period of a geostationary satellite is:",
      "options": [
        {
          "letter": "A",
          "text": "12 hours"
        },
        {
          "letter": "B",
          "text": "24 hours"
        },
        {
          "letter": "C",
          "text": "1 month"
        },
        {
          "letter": "D",
          "text": "1 year"
        }
      ],
      "answer": "B",
      "explanation": "It matches Earth's rotation period so it stays fixed above one point. EduNexus",
      "lectures": [
        21
      ],
      "concept": "satellites",
      "repeated": false
    },
    {
      "id": "Q120",
      "q": "Weightlessness in an orbiting spacecraft occurs because:",
      "options": [
        {
          "letter": "A",
          "text": "Gravity is zero there"
        },
        {
          "letter": "B",
          "text": "The spacecraft and astronaut fall together with the same acceleration"
        },
        {
          "letter": "C",
          "text": "Air is absent"
        },
        {
          "letter": "D",
          "text": "Mass becomes zero"
        }
      ],
      "answer": "B",
      "explanation": "Both fall toward Earth at the same rate, so no normal reaction acts on the astronaut.",
      "lectures": [
        21
      ],
      "concept": "weightlessness",
      "repeated": true
    },
    {
      "id": "Q121",
      "q": "A car travels 60 km in 1.5 hours. Its average speed is:",
      "options": [
        {
          "letter": "A",
          "text": "30 km/h"
        },
        {
          "letter": "B",
          "text": "40 km/h"
        },
        {
          "letter": "C",
          "text": "90 km/h"
        },
        {
          "letter": "D",
          "text": "60 km/h"
        }
      ],
      "answer": "B",
      "explanation": "Average speed = 60/1.5 = 40 km/h.",
      "lectures": [
        2
      ],
      "concept": "velocity-acceleration",
      "repeated": false
    },
    {
      "id": "Q122",
      "q": "Which of these pairs has the same dimensions?",
      "options": [
        {
          "letter": "A",
          "text": "Work and power"
        },
        {
          "letter": "B",
          "text": "Force and momentum"
        },
        {
          "letter": "C",
          "text": "Work and energy"
        },
        {
          "letter": "D",
          "text": "Torque and power"
        }
      ],
      "answer": "C",
      "explanation": "Both work and energy have dimensions [M L^2 T^-2].",
      "lectures": [
        1
      ],
      "concept": "dimensions",
      "repeated": false
    },
    {
      "id": "Q123",
      "q": "A 70 kg person stands on a weighing scale in a lift accelerating upward at 2 m/s^2. The scale reads: (g = 10 m/s^2)",
      "options": [
        {
          "letter": "A",
          "text": "70 kg"
        },
        {
          "letter": "B",
          "text": "56 kg"
        },
        {
          "letter": "C",
          "text": "84 kg"
        },
        {
          "letter": "D",
          "text": "700 kg"
        }
      ],
      "answer": "C",
      "explanation": "Apparent weight = m(g + a) = 70 x 12 = 840 N, i.e. 84 kg equivalent. EduNexus",
      "lectures": [
        6
      ],
      "concept": "mass-weight",
      "repeated": true
    },
    {
      "id": "Q124",
      "q": "Two forces 6 N and 8 N act at right angles. The magnitude of their resultant is:",
      "options": [
        {
          "letter": "A",
          "text": "14 N"
        },
        {
          "letter": "B",
          "text": "2 N"
        },
        {
          "letter": "C",
          "text": "10 N"
        },
        {
          "letter": "D",
          "text": "48 N"
        }
      ],
      "answer": "C",
      "explanation": "R = sqrt(36 + 64) = 10 N.",
      "lectures": [
        2
      ],
      "concept": "vector-addition",
      "repeated": false
    },
    {
      "id": "Q125",
      "q": "A stone is dropped from a 45 m tower. Time to reach the ground: (g = 10 m/s^2)",
      "options": [
        {
          "letter": "A",
          "text": "3 s"
        },
        {
          "letter": "B",
          "text": "4.5 s"
        },
        {
          "letter": "C",
          "text": "9 s"
        },
        {
          "letter": "D",
          "text": "2 s"
        }
      ],
      "answer": "A",
      "explanation": "h = (1/2)gt^2 -> 45 = 5t^2 -> t = 3 s.",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q126",
      "q": "A cyclist rounds a curve of radius 20 m at 10 m/s. The centripetal acceleration is:",
      "options": [
        {
          "letter": "A",
          "text": "2 m/s^2"
        },
        {
          "letter": "B",
          "text": "5 m/s^2"
        },
        {
          "letter": "C",
          "text": "0.5 m/s^2"
        },
        {
          "letter": "D",
          "text": "200 m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "a = v^2/r = 100/20 = 5 m/s^2.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion",
      "repeated": true
    },
    {
      "id": "Q127",
      "q": "A 0.5 kg ball moving at 8 m/s is stopped in 0.2 s. The average force on it is:",
      "options": [
        {
          "letter": "A",
          "text": "20 N"
        },
        {
          "letter": "B",
          "text": "0.8 N"
        },
        {
          "letter": "C",
          "text": "4 N"
        },
        {
          "letter": "D",
          "text": "80 N"
        }
      ],
      "answer": "A",
      "explanation": "F = m(v-u)/t = 0.5 x 8/0.2 = 20 N. EduNexus",
      "lectures": [
        9
      ],
      "concept": "impulse",
      "repeated": true
    },
    {
      "id": "Q128",
      "q": "How much work is done lifting a 20 kg box 1.5 m vertically? (g = 10 m/s^2)",
      "options": [
        {
          "letter": "A",
          "text": "30 J"
        },
        {
          "letter": "B",
          "text": "300 J"
        },
        {
          "letter": "C",
          "text": "13.3 J"
        },
        {
          "letter": "D",
          "text": "200 J"
        }
      ],
      "answer": "B",
      "explanation": "W = mgh = 20 x 10 x 1.5 = 300 J.",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q129",
      "q": "A bulb consumes 60 J of energy in 2 s. Its power rating is:",
      "options": [
        {
          "letter": "A",
          "text": "120 W"
        },
        {
          "letter": "B",
          "text": "30 W"
        },
        {
          "letter": "C",
          "text": "15 W"
        },
        {
          "letter": "D",
          "text": "240 W"
        }
      ],
      "answer": "B",
      "explanation": "P = 60/2 = 30 W.",
      "lectures": [
        7
      ],
      "concept": "power",
      "repeated": true
    },
    {
      "id": "Q130",
      "q": "A truck of mass 4000 kg moving at 10 m/s is brought to rest. The work done by brakes equals:",
      "options": [
        {
          "letter": "A",
          "text": "40000 J"
        },
        {
          "letter": "B",
          "text": "200000 J"
        },
        {
          "letter": "C",
          "text": "20000 J"
        },
        {
          "letter": "D",
          "text": "4000 J"
        }
      ],
      "answer": "B",
      "explanation": "Work = change in KE = (1/2) x 4000 x 100 = 200000 J.",
      "lectures": [
        7
      ],
      "concept": "work-energy-theorem",
      "repeated": true
    },
    {
      "id": "Q131",
      "q": "Which quantity is conserved in the absence of external forces?",
      "options": [
        {
          "letter": "A",
          "text": "Kinetic energy always"
        },
        {
          "letter": "B",
          "text": "Total momentum"
        },
        {
          "letter": "C",
          "text": "Velocity of each body"
        },
        {
          "letter": "D",
          "text": "Potential energy"
        }
      ],
      "answer": "B",
      "explanation": "Newton's laws imply total momentum of an isolated system is conserved. EduNexus",
      "lectures": [
        9
      ],
      "concept": "momentum-conservation",
      "repeated": true
    },
    {
      "id": "Q132",
      "q": "A man pushes a wall with 50 N force but the wall does not move. Work done by the man is:",
      "options": [
        {
          "letter": "A",
          "text": "50 J"
        },
        {
          "letter": "B",
          "text": "Zero"
        },
        {
          "letter": "C",
          "text": "2500 J"
        },
        {
          "letter": "D",
          "text": "Cannot be determined"
        }
      ],
      "answer": "B",
      "explanation": "No displacement means no work: W = F d = 0.",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q133",
      "q": "The momentum of a 0.2 kg cricket ball bowled at 30 m/s is:",
      "options": [
        {
          "letter": "A",
          "text": "150 kg m/s"
        },
        {
          "letter": "B",
          "text": "6 kg m/s"
        },
        {
          "letter": "C",
          "text": "60 kg m/s"
        },
        {
          "letter": "D",
          "text": "0.6 kg m/s"
        }
      ],
      "answer": "B",
      "explanation": "p = 0.2 x 30 = 6 kg m/s.",
      "lectures": [
        9
      ],
      "concept": "momentum",
      "repeated": false
    },
    {
      "id": "Q134",
      "q": "If net external force on a system is zero, its center of mass:",
      "options": [
        {
          "letter": "A",
          "text": "Accelerates"
        },
        {
          "letter": "B",
          "text": "Moves with constant velocity"
        },
        {
          "letter": "C",
          "text": "Remains at rest always"
        },
        {
          "letter": "D",
          "text": "Moves in a circle"
        }
      ],
      "answer": "B",
      "explanation": "F_ext = M a_cm; zero net force means the center of mass keeps constant velocity.",
      "lectures": [
        12
      ],
      "concept": "centre-of-mass",
      "repeated": false
    },
    {
      "id": "Q135",
      "q": "A door is easiest to open when force is applied:",
      "options": [
        {
          "letter": "A",
          "text": "Near the hinges"
        },
        {
          "letter": "B",
          "text": "At the middle"
        },
        {
          "letter": "C",
          "text": "Farthest from the hinges"
        },
        {
          "letter": "D",
          "text": "At the top corner"
        }
      ],
      "answer": "C",
      "explanation": "Torque = rF; maximum lever arm (farthest from hinges) gives maximum torque. EduNexus",
      "lectures": [
        11
      ],
      "concept": "torque",
      "repeated": true
    },
    {
      "id": "Q136",
      "q": "Two satellites of masses m and 2m orbit at the same height. Their orbital speeds are:",
      "options": [
        {
          "letter": "A",
          "text": "Same"
        },
        {
          "letter": "B",
          "text": "Double for the heavier"
        },
        {
          "letter": "C",
          "text": "Half for the heavier"
        },
        {
          "letter": "D",
          "text": "Zero"
        }
      ],
      "answer": "A",
      "explanation": "Orbital speed v = sqrt(GM/r) depends on the planet's mass and radius, not the satellite's mass.",
      "lectures": [
        21
      ],
      "concept": "satellites",
      "repeated": false
    },
    {
      "id": "Q137",
      "q": "A body of mass 5 kg has kinetic energy 100 J. Its speed is about:",
      "options": [
        {
          "letter": "A",
          "text": "6.3 m/s"
        },
        {
          "letter": "B",
          "text": "20 m/s"
        },
        {
          "letter": "C",
          "text": "10 m/s"
        },
        {
          "letter": "D",
          "text": "4.5 m/s"
        }
      ],
      "answer": "A",
      "explanation": "v = sqrt(2KE/m) = sqrt(200/5) = sqrt(40) approx 6.3 m/s.",
      "lectures": [
        7
      ],
      "concept": "kinetic-energy",
      "repeated": true
    },
    {
      "id": "Q138",
      "q": "When a balloon rises, its potential energy ____ and kinetic energy ____.",
      "options": [
        {
          "letter": "A",
          "text": "Increases, decreases"
        },
        {
          "letter": "B",
          "text": "Decreases, increases"
        },
        {
          "letter": "C",
          "text": "Increases, may vary"
        },
        {
          "letter": "D",
          "text": "Remains constant, increases"
        }
      ],
      "answer": "C",
      "explanation": "Height gain increases PE; KE depends on its speed, which may vary.",
      "lectures": [
        8
      ],
      "concept": "energy-conservation",
      "repeated": true
    },
    {
      "id": "Q139",
      "q": "The work done against gravity in moving a mass horizontally is:",
      "options": [
        {
          "letter": "A",
          "text": "mgh"
        },
        {
          "letter": "B",
          "text": "Zero"
        },
        {
          "letter": "C",
          "text": "mg x distance"
        },
        {
          "letter": "D",
          "text": "Negative"
        }
      ],
      "answer": "B",
      "explanation": "Displacement is perpendicular to weight, so gravity does no work. EduNexus",
      "lectures": [
        7
      ],
      "concept": "work",
      "repeated": true
    },
    {
      "id": "Q140",
      "q": "A force of 20 N acts for 5 s on a 10 kg block initially at rest on a frictionless surface. Its final speed is:",
      "options": [
        {
          "letter": "A",
          "text": "10 m/s"
        },
        {
          "letter": "B",
          "text": "5 m/s"
        },
        {
          "letter": "C",
          "text": "2 m/s"
        },
        {
          "letter": "D",
          "text": "100 m/s"
        }
      ],
      "answer": "A",
      "explanation": "Impulse = 100 N s = m v -> v = 100/10 = 10 m/s.",
      "lectures": [
        9
      ],
      "concept": "impulse",
      "repeated": true
    },
    {
      "id": "Q141",
      "q": "Which graph best shows distance covered by a freely falling body versus time?",
      "options": [
        {
          "letter": "A",
          "text": "Straight line through origin"
        },
        {
          "letter": "B",
          "text": "Parabola curving upward"
        },
        {
          "letter": "C",
          "text": "Horizontal line"
        },
        {
          "letter": "D",
          "text": "Parabola curving downward"
        }
      ],
      "answer": "B",
      "explanation": "s = (1/2)gt^2 is quadratic in t, an upward-opening parabola.",
      "lectures": [
        3
      ],
      "concept": "free-fall",
      "repeated": true
    },
    {
      "id": "Q142",
      "q": "A 60 kg astronaut in deep space pushes a 120 kg satellite with 30 N. The astronaut's acceleration is:",
      "options": [
        {
          "letter": "A",
          "text": "0.25 m/s^2"
        },
        {
          "letter": "B",
          "text": "0.5 m/s^2"
        },
        {
          "letter": "C",
          "text": "2 m/s^2"
        },
        {
          "letter": "D",
          "text": "1 m/s^2"
        }
      ],
      "answer": "B",
      "explanation": "By Newton's third law the astronaut feels 30 N back: a = 30/60 = 0.5 m/s^2.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws",
      "repeated": true
    },
    {
      "id": "Q143",
      "q": "Power of an engine doing 12000 J of work every minute is:",
      "options": [
        {
          "letter": "A",
          "text": "200 W"
        },
        {
          "letter": "B",
          "text": "720 W"
        },
        {
          "letter": "C",
          "text": "12000 W"
        },
        {
          "letter": "D",
          "text": "2000 W"
        }
      ],
      "answer": "A",
      "explanation": "P = 12000/60 = 200 W. EduNexus",
      "lectures": [
        7
      ],
      "concept": "power",
      "repeated": true
    },
    {
      "id": "Q144",
      "q": "A pendulum bob at its lowest point has:",
      "options": [
        {
          "letter": "A",
          "text": "Maximum PE, zero KE"
        },
        {
          "letter": "B",
          "text": "Maximum KE, minimum PE"
        },
        {
          "letter": "C",
          "text": "Zero KE and zero PE"
        },
        {
          "letter": "D",
          "text": "Maximum total energy"
        }
      ],
      "answer": "B",
      "explanation": "At the bottom, height (PE) is minimum and speed (KE) is maximum.",
      "lectures": [
        15
      ],
      "concept": "oscillations-pendulum",
      "repeated": true
    },
    {
      "id": "Q145",
      "q": "If Earth's radius were halved with the same mass, your weight would become:",
      "options": [
        {
          "letter": "A",
          "text": "Half"
        },
        {
          "letter": "B",
          "text": "Double"
        },
        {
          "letter": "C",
          "text": "Four times"
        },
        {
          "letter": "D",
          "text": "Unchanged"
        }
      ],
      "answer": "C",
      "explanation": "g = GM/R^2; halving R multiplies g by 4, so weight becomes four times.",
      "lectures": [
        21
      ],
      "concept": "gravitation",
      "repeated": true
    }
  ],
  "shorts": [
    {
      "id": "Q001",
      "q": "Define scalar and vector quantities. Give two examples of each.",
      "modelAnswer": "A scalar quantity has only magnitude, for example mass and temperature. A vector quantity has both magnitude and direction, for example velocity and force. Scalars add by ordinary arithmetic, while vectors follow the triangle or parallelogram law of addition.",
      "lectures": [
        1
      ],
      "concept": "scalar-vector"
    },
    {
      "id": "Q002",
      "q": "State the equations of motion for uniformly accelerated motion.",
      "modelAnswer": "For a body moving with constant acceleration a, initial velocity u: (1) v = u + at, (2) s = ut + (1/2)at^2, (3) v^2 = u^2 + 2as. Here v is final velocity, s is displacement and t is time.",
      "lectures": [
        3
      ],
      "concept": "equations-of-motion"
    },
    {
      "id": "Q003",
      "q": "What is the difference between distance and displacement?",
      "modelAnswer": "Distance is the total path length travelled and is a scalar; it is always positive. Displacement is the straight-line change in position from start to end point and is a vector; it can be zero or negative. Distance is always greater than or equal to the magnitude of displacement.",
      "lectures": [
        2
      ],
      "concept": "distance-displacement"
    },
    {
      "id": "Q004",
      "q": "Define centripetal force and write its formula.",
      "modelAnswer": "Centripetal force is the net force required to keep a body moving in a circular path; it always acts toward the center of the circle. Its magnitude is F = mv^2/r = m*r*omega^2, where m is mass, v is speed, r is radius and omega is angular velocity.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion"
    },
    {
      "id": "Q005",
      "q": "State Newton's three laws of motion.",
      "modelAnswer": "First law (inertia): a body keeps its state of rest or uniform motion unless acted upon by a net force. Second law: F = ma; acceleration is proportional to net force and inversely proportional to mass. Third law: every action has an equal and opposite reaction acting on the other body.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws"
    },
    {
      "id": "Q006",
      "q": "Define work and write its SI unit.",
      "modelAnswer": "Work is done when a force causes displacement in the direction of the force: W = F*d*cos(theta), where theta is the angle between force and displacement. Its SI unit is the joule (J). If theta = 90 degrees, no work is done.",
      "lectures": [
        7
      ],
      "concept": "work"
    },
    {
      "id": "Q007",
      "q": "What is kinetic energy? Write its formula.",
      "modelAnswer": "Kinetic energy is the energy a body possesses due to its motion. KE = (1/2)mv^2, where m is mass and v is speed. Its SI unit is the joule. If speed doubles, kinetic energy becomes four times.",
      "lectures": [
        7
      ],
      "concept": "kinetic-energy"
    },
    {
      "id": "Q008",
      "q": "Define power and give its SI unit.",
      "modelAnswer": "Power is the rate of doing work: P = W/t, or equivalently P = F*v for a constant force. Its SI unit is the watt (W), where 1 W = 1 J/s. One horsepower equals 746 watts.",
      "lectures": [
        7
      ],
      "concept": "power"
    },
    {
      "id": "Q009",
      "q": "State the law of conservation of linear momentum.",
      "modelAnswer": "In the absence of external forces, the total linear momentum of a system remains constant. For a collision: m1*u1 + m2*u2 = m1*v1 + m2*v2. This explains the recoil of a gun and rocket propulsion.",
      "lectures": [
        9
      ],
      "concept": "momentum-conservation"
    },
    {
      "id": "Q010",
      "q": "Define torque and write its formula.",
      "modelAnswer": "Torque is the turning effect of a force about a pivot: tau = r*F*sin(theta), where r is the distance from the pivot and theta is the angle between r and F. Its SI unit is newton-meter (N m). Maximum torque occurs when force is perpendicular to the lever arm.",
      "lectures": [
        11
      ],
      "concept": "torque"
    },
    {
      "id": "Q011",
      "q": "What is moment of inertia? On what factors does it depend?",
      "modelAnswer": "Moment of inertia is the resistance of a body to angular acceleration, the rotational analog of mass: I = sum(m*r^2). It depends on the mass of the body and how that mass is distributed about the axis of rotation.",
      "lectures": [
        11
      ],
      "concept": "moment-of-inertia"
    },
    {
      "id": "Q012",
      "q": "State the law of conservation of angular momentum with one example.",
      "modelAnswer": "If no external torque acts on a system, its total angular momentum L = I*omega stays constant. Example: an ice skater spins faster when pulling the arms in, because reduced moment of inertia raises angular velocity.",
      "lectures": [
        13
      ],
      "concept": "angular-momentum-conservation"
    },
    {
      "id": "Q013",
      "q": "Define projectile motion and give its trajectory shape.",
      "modelAnswer": "Projectile motion is the motion of a body thrown into the air under gravity alone (air resistance ignored). The horizontal velocity stays constant while vertical motion is uniformly accelerated, so the trajectory is a parabola.",
      "lectures": [
        3
      ],
      "concept": "projectile"
    },
    {
      "id": "Q014",
      "q": "What is meant by the range of a projectile? When is it maximum?",
      "modelAnswer": "Range is the horizontal distance covered by the projectile before hitting the ground: R = (u^2*sin(2*theta))/g. It is maximum at a projection angle of 45 degrees; angles of theta and (90 - theta) give the same range.",
      "lectures": [
        3
      ],
      "concept": "projectile-range"
    },
    {
      "id": "Q015",
      "q": "Define static and kinetic friction.",
      "modelAnswer": "Static friction acts between surfaces at rest and adjusts up to a maximum (mu_s*N) to prevent motion. Kinetic friction acts during sliding and is nearly constant (mu_k*N), usually smaller than maximum static friction. Both oppose relative motion.",
      "lectures": [
        5
      ],
      "concept": "friction"
    },
    {
      "id": "Q016",
      "q": "What is free fall? What is the acceleration of a freely falling body?",
      "modelAnswer": "Free fall is motion under gravity alone with no air resistance. Near Earth's surface every freely falling body accelerates downward at g = 9.8 m/s^2, independent of its mass, as shown by Galileo.",
      "lectures": [
        3
      ],
      "concept": "free-fall"
    },
    {
      "id": "Q017",
      "q": "Define impulse and state its relation with momentum.",
      "modelAnswer": "Impulse is the product of force and the time it acts: J = F*t. It equals the change in linear momentum: J = delta_p = m(v - u). Its SI unit is newton-second (N s).",
      "lectures": [
        9
      ],
      "concept": "impulse"
    },
    {
      "id": "Q018",
      "q": "Distinguish between elastic and inelastic collisions.",
      "modelAnswer": "In an elastic collision both momentum and kinetic energy are conserved (e.g. atomic collisions). In an inelastic collision momentum is conserved but kinetic energy is partly converted to heat or sound (e.g. a car crash). Perfectly inelastic bodies stick together.",
      "lectures": [
        10
      ],
      "concept": "collisions"
    },
    {
      "id": "Q019",
      "q": "What is weightlessness? Explain with the example of an orbiting satellite.",
      "modelAnswer": "Weightlessness is the feeling of zero weight when no normal reaction acts on a body. In an orbiting satellite, both the astronaut and the satellite fall toward Earth with the same acceleration, so the astronaut floats freely inside.",
      "lectures": [
        21
      ],
      "concept": "weightlessness"
    },
    {
      "id": "Q020",
      "q": "Define angular velocity and write its relation with linear velocity.",
      "modelAnswer": "Angular velocity (omega) is the rate of change of angular displacement, measured in rad/s. For circular motion, linear (tangential) velocity v = r*omega, where r is the radius.",
      "lectures": [
        11
      ],
      "concept": "angular-motion"
    }
  ],
  "longs": [
    {
      "id": "Q001",
      "q": "Derive the three equations of motion for a body moving with uniform acceleration.",
      "modelAnswer": "Consider a body with initial velocity u and constant acceleration a. (1) By definition a = (v - u)/t, so v = u + at. (2) Average velocity = (u + v)/2; displacement s = average velocity * t = (u + v)t/2. Substituting v = u + at gives s = ut + (1/2)at^2. (3) From v = u + at, t = (v - u)/a; putting this in s = (u+v)t/2 gives 2as = v^2 - u^2, i.e. v^2 = u^2 + 2as.",
      "lectures": [
        3
      ],
      "concept": "equations-of-motion"
    },
    {
      "id": "Q002",
      "q": "Explain Newton's second law of motion and derive F = ma.",
      "modelAnswer": "The second law states that the rate of change of momentum of a body is proportional to the applied force and occurs in the direction of the force. Momentum p = mv, so dp/dt = m(dv/dt) = ma for constant mass. Hence F is proportional to ma; choosing units so the constant is 1 gives F = ma. One newton is the force that gives 1 kg mass an acceleration of 1 m/s^2. This law defines force quantitatively and explains why heavier objects need larger forces for the same acceleration.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws"
    },
    {
      "id": "Q003",
      "q": "State and prove the work-energy theorem.",
      "modelAnswer": "The work-energy theorem states that the net work done on a body equals its change in kinetic energy. Proof: for constant force F over displacement s, W = F*s. Using F = ma and v^2 = u^2 + 2as, we get W = ma*(v^2 - u^2)/(2a) = (1/2)mv^2 - (1/2)mu^2 = KE_final - KE_initial. Thus work done by the net force appears as a change in kinetic energy. Example: brakes do negative work on a car, reducing its kinetic energy to zero.",
      "lectures": [
        7,
        8
      ],
      "concept": "work-energy-theorem"
    },
    {
      "id": "Q004",
      "q": "Derive an expression for the maximum height and range of a projectile.",
      "modelAnswer": "Let projection speed be u at angle theta. Initial components: ux = u*cos(theta), uy = u*sin(theta). At maximum height vertical velocity is zero: 0 = (u*sin(theta))^2 - 2gH, so H = (u^2*sin^2(theta))/(2g). Time of flight: total vertical displacement zero gives T = (2u*sin(theta))/g. Range R = ux*T = (u^2*2*sin(theta)*cos(theta))/g = (u^2*sin(2*theta))/g, maximum at theta = 45 degrees.",
      "lectures": [
        3
      ],
      "concept": "projectile-range"
    },
    {
      "id": "Q005",
      "q": "Explain the law of conservation of mechanical energy with an example.",
      "modelAnswer": "When only conservative forces (like gravity) do work, the sum of kinetic and potential energy stays constant: KE + PE = constant. Example: a ball dropped from height h starts with PE = mgh and zero KE. As it falls, PE converts to KE; just before hitting the ground KE = (1/2)mv^2 = mgh. At every point the total remains mgh. If friction acts, some mechanical energy converts to heat and the total decreases.",
      "lectures": [
        8
      ],
      "concept": "energy-conservation"
    },
    {
      "id": "Q006",
      "q": "Discuss the motion of a body on an inclined plane. Derive acceleration down a smooth incline.",
      "modelAnswer": "On an incline of angle theta, weight mg acts vertically down. Resolving: component along the plane = mg*sin(theta), perpendicular = mg*cos(theta). The normal reaction N = mg*cos(theta) balances the perpendicular part. Along a smooth (frictionless) plane the net force is mg*sin(theta), so acceleration a = F/m = g*sin(theta), independent of mass. With friction, net force = mg*sin(theta) - mu_k*N, giving a = g(sin(theta) - mu_k*cos(theta)).",
      "lectures": [
        5
      ],
      "concept": "inclined-plane"
    },
    {
      "id": "Q007",
      "q": "Explain uniform circular motion and derive the expression for centripetal acceleration.",
      "modelAnswer": "In uniform circular motion speed is constant but direction changes continuously, so velocity changes and there is acceleration toward the center. Consider a small time dt in which the radius turns by d(theta) = omega*dt. The velocity vector turns by the same angle; the change in velocity dv = v*d(theta) = v*omega*dt. Thus a = dv/dt = v*omega. Since v = r*omega, a = v^2/r = r*omega^2, directed toward the center. The required centripetal force is F = ma = mv^2/r.",
      "lectures": [
        3,
        11
      ],
      "concept": "circular-motion"
    },
    {
      "id": "Q008",
      "q": "State Newton's law of gravitation and explain how it gives the acceleration due to gravity.",
      "modelAnswer": "Every mass attracts every other mass with F = G*m1*m2/r^2, where G = 6.67 x 10^-11 N m^2/kg^2. For a body of mass m near Earth's surface (mass M, radius R): mg = G*M*m/R^2, so g = GM/R^2, about 9.8 m/s^2. This shows g is independent of the body's mass and decreases with altitude as R grows. The same law explains planetary orbits and tides.",
      "lectures": [
        21
      ],
      "concept": "gravitation"
    },
    {
      "id": "Q009",
      "q": "Explain the conservation of angular momentum with two daily-life examples.",
      "modelAnswer": "When external torque is zero, L = I*omega remains constant. Example 1: a spinning ice skater pulls the arms in, reducing I, so omega increases and she spins faster; stretching arms out slows her. Example 2: a diver tucks the body to somersault faster, then straightens to slow rotation before entry. In both, no external torque acts (ignoring small friction), so the product I*omega is conserved.",
      "lectures": [
        13
      ],
      "concept": "angular-momentum-conservation"
    },
    {
      "id": "Q010",
      "q": "A 5 kg block slides down a smooth incline of 30 degrees. Calculate its acceleration and speed after sliding 10 m from rest.",
      "modelAnswer": "Acceleration down a smooth incline: a = g*sin(theta) = 10*sin(30) = 10*0.5 = 5 m/s^2. Using v^2 = u^2 + 2as with u = 0, s = 10 m: v^2 = 2*5*10 = 100, so v = 10 m/s. The mass cancels out, showing all bodies slide with the same acceleration on a smooth incline.",
      "lectures": [
        5
      ],
      "concept": "inclined-plane"
    },
    {
      "id": "Q011",
      "q": "Explain the difference between mass and weight. Why does weight change on the Moon?",
      "modelAnswer": "Mass is the quantity of matter in a body, measured in kg; it is constant everywhere and measures inertia. Weight is the gravitational force on the body, W = mg, measured in newtons; it depends on local gravity. The Moon's gravity is about 1/6 of Earth's, so the same mass weighs 1/6 as much there. In deep space far from masses, weight is nearly zero but mass is unchanged.",
      "lectures": [
        4
      ],
      "concept": "mass-weight"
    },
    {
      "id": "Q012",
      "q": "Derive the expression for the kinetic energy of a rolling body.",
      "modelAnswer": "A rolling body has both translational motion of its center (speed v) and rotation about the center (angular speed omega). Total KE = translational KE + rotational KE = (1/2)mv^2 + (1/2)I*omega^2. For rolling without slipping, v = r*omega. For a solid sphere I = (2/5)mr^2, so total KE = (1/2)mv^2 + (1/5)mv^2 = (7/10)mv^2. This is why a rolling ball reaches the bottom of a ramp slower than a sliding block.",
      "lectures": [
        11
      ],
      "concept": "rolling"
    },
    {
      "id": "Q013",
      "q": "Explain action and reaction with three examples. Why don't they cancel each other?",
      "modelAnswer": "Newton's third law: every action has an equal and opposite reaction. Examples: (1) a book on a table pushes down on the table; the table pushes up on the book; (2) a rocket expels gas backward; the gas pushes the rocket forward; (3) walking: the foot pushes the ground backward, the ground pushes the foot forward. They do not cancel because action and reaction act on DIFFERENT bodies; only forces on the same body can cancel in the net force.",
      "lectures": [
        4
      ],
      "concept": "newtons-laws"
    },
    {
      "id": "Q014",
      "q": "A car of mass 1000 kg moving at 20 m/s is stopped by brakes in 50 m. Find the braking force and the work done.",
      "modelAnswer": "Using v^2 = u^2 + 2as: 0 = 400 + 2*a*50, so a = -4 m/s^2. Braking force F = ma = 1000*(-4) = -4000 N (4000 N opposite to motion). Work done by brakes W = F*s = -4000*50 = -200,000 J. By the work-energy theorem this equals the change in KE: 0 - (1/2)*1000*400 = -200,000 J. Negative work removes the car's kinetic energy.",
      "lectures": [
        7
      ],
      "concept": "work-energy-theorem"
    },
    {
      "id": "Q015",
      "q": "What is simple harmonic motion? Give its characteristics and two examples.",
      "modelAnswer": "Simple harmonic motion is to-and-fro motion in which acceleration is proportional to displacement and always directed toward the mean position: a = -omega^2*x. Characteristics: motion repeats periodically; velocity is maximum at the mean position and zero at extremes; acceleration is maximum at extremes. Examples: a mass on a spring (T = 2*pi*sqrt(m/k)) and a simple pendulum for small angles (T = 2*pi*sqrt(l/g)). SHM is the basis of waves, sound and oscillations in physics.",
      "lectures": [
        15
      ],
      "concept": "oscillations-pendulum"
    }
  ]
};
export const BANK_SUBJECTS = [
  { code: 'PHY101', title: 'Introduction to Physics', term: 'Midterm',
    scope: 'Lectures 1\u201322', lectures: PHY101_LECTURES, bank: PHY101_BANK },
];

// ---- Paper generation (pure: no React, no network) ----
// Used by PaperBuilder (student), TestPapersHome (shared pattern links) and
// AdminPaperPatterns (admin). One implementation, so a shared link builds
// exactly the paper the admin designed.
//   1. Balanced coverage: round-robin across the selected lectures.
//   2. Most-repeated first: within a lecture, questions whose concept also
//      appears in the subjective bank come before the rest.
//   3. No padding, ever: fewer verified questions than the target means a
//      shorter paper, never an invented filler.
export function pickRoundRobin(rows, lectures, target) {
  const pools = {};
  lectures.forEach((n) => {
    pools[n] = rows
      .filter((q) => q.lectures.includes(n))
      .sort((a, b) => (b.repeated ? 1 : 0) - (a.repeated ? 1 : 0) || a.id.localeCompare(b.id));
  });
  const used = new Set();
  const out = [];
  let progress = true;
  while (out.length < target && progress) {
    progress = false;
    for (const n of lectures) {
      if (out.length >= target) break;
      const next = pools[n].find((q) => !used.has(q.id));
      if (next) { used.add(next.id); out.push(next); progress = true; }
    }
  }
  return out;
}

export function buildPaper(subject, lectures, targets = {}) {
  const mcqTarget = targets.mcq ?? 20;
  const shortTarget = targets.short ?? 3;
  const longTarget = targets.long ?? 3;
  const mcqs = pickRoundRobin(subject.bank.mcqs, lectures, mcqTarget);
  const shorts = pickRoundRobin(subject.bank.shorts, lectures, shortTarget);
  const longs = pickRoundRobin(subject.bank.longs, lectures, longTarget);
  return {
    slug: 'builder:' + subject.code + ':' + lectures.join('-'),
    code: subject.code,
    title: subject.title,
    term: subject.term,
    lectures: 'Lectures ' + lectures.join(', ') + ' (selected)',
    minutes: 90,
    marks: { mcq: mcqs.length, short: shorts.length * 3, long: longs.length * 5,
             total: mcqs.length + shorts.length * 3 + longs.length * 5 },
    scopeNote: 'Custom paper: only verified bank questions for the lectures you selected. No question was invented to fill this paper.',
    sourceNote: 'MCQs and subjective questions verbatim from the verified midterm banks; lecture tags follow the handout lesson topics.',
    mcqs, shorts, longs,
    isCustom: true,
    // patternParams lets any custom paper rebuild itself from a share link:
    // /test-papers?subject=CODE&lectures=1,3&mcqs=20&shorts=3&longs=3
    patternParams: { subject: subject.code, lectures: [...lectures], mcq: mcqTarget, short: shortTarget, long: longTarget },
  };
}
