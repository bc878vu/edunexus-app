// Test-paper registry for EduNexus (src/testPapersData.js).
// Content rule: only verified bank questions — never invented, never padded.
// PHY101 Lectures 1–9 paper: 20 MCQs + 3 shorts + 3 longs, 44 marks, 90 minutes.
// Lecture 10 (collisions) and everything after it is deliberately excluded.

export const TEST_PAPERS = [
  {
    "slug": "phy101-lec1-9",
    "code": "PHY101",
    "title": "Introduction to Physics",
    "term": "Midterm",
    "lectures": "Lectures 1\u20139",
    "minutes": 90,
    "marks": {
      "mcq": 20,
      "short": 9,
      "long": 15,
      "total": 44
    },
    "scopeNote": "Units, vectors, motion, Newton's laws, friction, apparent weight, work\u2013energy, momentum. Nothing from lecture 10 or later is included.",
    "sourceNote": "MCQs verbatim from the verified midterm MCQ bank (145 questions); shorts/longs from the verified midterm subjective bank (35 questions); answers checked against the course handout. No per-question past-paper appearance is claimed anywhere.",
    "mcqs": [
      {
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
        ]
      },
      {
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
        "explanation": "Leading zeros are not significant; the trailing zero after the 5 is significant, so 4, 5 and 0 give 3 significant figures.",
        "lectures": [
          1
        ]
      },
      {
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
        "explanation": "Force has both magnitude and direction, so it is a vector.",
        "lectures": [
          1
        ]
      },
      {
        "q": "Two vectors A and B are perpendicular. Their dot product A \u00b7 B equals:",
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
        "explanation": "A \u00b7 B = AB cos \u03b8; with \u03b8 = 90\u00b0, cos 90\u00b0 = 0.",
        "lectures": [
          2
        ]
      },
      {
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
        ]
      },
      {
        "q": "Which equation of motion is correct for constant acceleration?",
        "options": [
          {
            "letter": "A",
            "text": "v = u + at\u00b2"
          },
          {
            "letter": "B",
            "text": "s = ut + at\u00b2"
          },
          {
            "letter": "C",
            "text": "v\u00b2 = u\u00b2 + 2as"
          },
          {
            "letter": "D",
            "text": "s = ut \u2212 2as"
          }
        ],
        "answer": "C",
        "explanation": "The standard equations are v = u + at, s = ut + \u00bdat\u00b2, v\u00b2 = u\u00b2 + 2as.",
        "lectures": [
          3
        ]
      },
      {
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
        "explanation": "Range = (u\u00b2 sin 2\u03b8)/g, maximum when sin 2\u03b8 = 1, i.e. \u03b8 = 45 degrees.",
        "lectures": [
          3
        ]
      },
      {
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
        ]
      },
      {
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
        "explanation": "The first law states a body keeps its state of rest or uniform motion unless acted upon, the law of inertia.",
        "lectures": [
          4
        ]
      },
      {
        "q": "A force of 10 N acts on a 2 kg mass. The acceleration produced is:",
        "options": [
          {
            "letter": "A",
            "text": "20 m/s\u00b2"
          },
          {
            "letter": "B",
            "text": "5 m/s\u00b2"
          },
          {
            "letter": "C",
            "text": "0.2 m/s\u00b2"
          },
          {
            "letter": "D",
            "text": "12 m/s\u00b2"
          }
        ],
        "answer": "B",
        "explanation": "a = F/m = 10/2 = 5 m/s\u00b2.",
        "lectures": [
          4
        ]
      },
      {
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
        ]
      },
      {
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
        "explanation": "Static friction self-adjusts to match the applied force until the limiting value \u03bcs\u00b7N is reached.",
        "lectures": [
          5
        ]
      },
      {
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
        ]
      },
      {
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
        ]
      },
      {
        "q": "A 70 kg person stands on a weighing scale in a lift accelerating upward at 2 m/s\u00b2. The scale reads: (g = 10 m/s\u00b2)",
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
        "explanation": "Apparent weight = m(g + a) = 70 \u00d7 12 = 840 N, i.e. 84 kg equivalent.",
        "lectures": [
          6
        ]
      },
      {
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
        "explanation": "KE is proportional to v\u00b2, so doubling speed quadruples KE.",
        "lectures": [
          7
        ]
      },
      {
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
        "explanation": "W = F\u00b7d\u00b7cos \u03b8; no displacement (or perpendicular force) means no work.",
        "lectures": [
          7
        ]
      },
      {
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
        ]
      },
      {
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
            "text": "Force \u00d7 distance"
          },
          {
            "letter": "D",
            "text": "Mass \u00d7 acceleration"
          }
        ],
        "answer": "B",
        "explanation": "Impulse J = F \u00d7 t = change in momentum (\u0394p).",
        "lectures": [
          9
        ]
      },
      {
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
        "explanation": "p = mv = 1000 \u00d7 20 = 20000 kg m/s.",
        "lectures": [
          9
        ]
      }
    ],
    "shorts": [
      {
        "q": "Define scalar and vector quantities. Give two examples of each.",
        "model_answer": "A scalar quantity has only magnitude, for example mass and temperature. A vector quantity has both magnitude and direction, for example velocity and force. Scalars add by ordinary arithmetic, while vectors follow the triangle or parallelogram law of addition.",
        "lectures": [
          1
        ]
      },
      {
        "q": "Define static and kinetic friction.",
        "model_answer": "Static friction acts between surfaces at rest and adjusts up to a maximum (\u03bcs\u00b7N) to prevent motion. Kinetic friction acts during sliding and is nearly constant (\u03bck\u00b7N), usually smaller than maximum static friction. Both oppose relative motion.",
        "lectures": [
          5
        ]
      },
      {
        "q": "Define impulse and state its relation with momentum.",
        "model_answer": "Impulse is the product of force and the time it acts: J = F\u00b7t. It equals the change in linear momentum: J = \u0394p = m(v \u2212 u). Its SI unit is newton-second (N\u00b7s).",
        "lectures": [
          9
        ]
      }
    ],
    "longs": [
      {
        "q": "Derive the three equations of motion for a body moving with uniform acceleration.",
        "model_answer": "Consider a body with initial velocity u and constant acceleration a. (1) By definition a = (v \u2212 u)/t, so v = u + at. (2) Average velocity = (u + v)/2; displacement s = average velocity \u00d7 t = (u + v)t/2. Substituting v = u + at gives s = ut + \u00bdat\u00b2. (3) From v = u + at, t = (v \u2212 u)/a; putting this in s = (u + v)t/2 gives 2as = v\u00b2 \u2212 u\u00b2, i.e. v\u00b2 = u\u00b2 + 2as.",
        "lectures": [
          3
        ]
      },
      {
        "q": "Explain Newton's second law of motion and derive F = ma.",
        "model_answer": "The second law states that the rate of change of momentum of a body is proportional to the applied force and occurs in the direction of the force. Momentum p = mv, so dp/dt = m(dv/dt) = ma for constant mass. Hence F is proportional to ma; choosing units so the constant is 1 gives F = ma. One newton is the force that gives 1 kg mass an acceleration of 1 m/s\u00b2. This law defines force quantitatively and explains why heavier objects need larger forces for the same acceleration.",
        "lectures": [
          4
        ]
      },
      {
        "q": "State and prove the work-energy theorem.",
        "model_answer": "The work-energy theorem states that the net work done on a body equals its change in kinetic energy. Proof: for constant force F over displacement s, W = F\u00b7s. Using F = ma and v\u00b2 = u\u00b2 + 2as, we get W = ma \u00d7 (v\u00b2 \u2212 u\u00b2)/(2a) = \u00bdmv\u00b2 \u2212 \u00bdmu\u00b2 = KE(final) \u2212 KE(initial). Thus work done by the net force appears as a change in kinetic energy. Example: brakes do negative work on a car, reducing its kinetic energy to zero.",
        "lectures": [
          7,
          8
        ]
      }
    ]
  }
];

export function getTestPaper(slug) {
  return TEST_PAPERS.find((p) => p.slug === slug) || null;
}

export function paperQuestionCount(paper) {
  return paper.mcqs.length + paper.shorts.length + paper.longs.length;
}
