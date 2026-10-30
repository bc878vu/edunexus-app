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
    "lectures": "Lectures 1–9",
    "minutes": 90,
    "marks": {
      "mcq": 20,
      "short": 9,
      "long": 15,
      "total": 44
    },
    "scopeNote": "Units, vectors, motion, Newton's laws, friction, apparent weight, work–energy, momentum. Nothing from lecture 10 or later is included.",
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
        "explanation": "Mass is a fundamental quantity; the kilogram is its SI base unit. Newton, joule and watt are derived units."
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
        "explanation": "Leading zeros are not significant; the trailing zero after the 5 is significant, so 4, 5 and 0 give 3 significant figures."
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
        "explanation": "Force has both magnitude and direction, so it is a vector."
      },
      {
        "q": "Two vectors A and B are perpendicular. Their dot product A · B equals:",
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
        "explanation": "A · B = AB cos θ; with θ = 90°, cos 90° = 0."
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
        "explanation": "Slope = change in displacement / change in time = velocity."
      },
      {
        "q": "Which equation of motion is correct for constant acceleration?",
        "options": [
          {
            "letter": "A",
            "text": "v = u + at²"
          },
          {
            "letter": "B",
            "text": "s = ut + at²"
          },
          {
            "letter": "C",
            "text": "v² = u² + 2as"
          },
          {
            "letter": "D",
            "text": "s = ut − 2as"
          }
        ],
        "answer": "C",
        "explanation": "The standard equations are v = u + at, s = ut + ½at², v² = u² + 2as."
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
        "explanation": "Range = (u² sin 2θ)/g, maximum when sin 2θ = 1, i.e. θ = 45 degrees."
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
        "explanation": "Constant horizontal velocity plus uniformly accelerated vertical motion traces a parabola."
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
        "explanation": "The first law states a body keeps its state of rest or uniform motion unless acted upon, the law of inertia."
      },
      {
        "q": "A force of 10 N acts on a 2 kg mass. The acceleration produced is:",
        "options": [
          {
            "letter": "A",
            "text": "20 m/s²"
          },
          {
            "letter": "B",
            "text": "5 m/s²"
          },
          {
            "letter": "C",
            "text": "0.2 m/s²"
          },
          {
            "letter": "D",
            "text": "12 m/s²"
          }
        ],
        "answer": "B",
        "explanation": "a = F/m = 10/2 = 5 m/s²."
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
        "explanation": "Action and reaction are equal in magnitude, opposite in direction, acting on different bodies."
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
        "explanation": "Static friction self-adjusts to match the applied force until the limiting value μs·N is reached."
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
        "explanation": "Mass is intrinsic matter content; weight = mg varies with local gravity."
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
        "explanation": "For equilibrium, upward tension balances downward weight: T = mg."
      },
      {
        "q": "A 70 kg person stands on a weighing scale in a lift accelerating upward at 2 m/s². The scale reads: (g = 10 m/s²)",
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
        "explanation": "Apparent weight = m(g + a) = 70 × 12 = 840 N, i.e. 84 kg equivalent."
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
        "explanation": "KE is proportional to v², so doubling speed quadruples KE."
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
        "explanation": "W = F·d·cos θ; no displacement (or perpendicular force) means no work."
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
        "explanation": "With only conservative forces (like gravity), KE + PE stays constant."
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
            "text": "Force × distance"
          },
          {
            "letter": "D",
            "text": "Mass × acceleration"
          }
        ],
        "answer": "B",
        "explanation": "Impulse J = F × t = change in momentum (Δp)."
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
        "explanation": "p = mv = 1000 × 20 = 20000 kg m/s."
      }
    ],
    "shorts": [
      {
        "q": "Define scalar and vector quantities. Give two examples of each.",
        "model_answer": "A scalar quantity has only magnitude, for example mass and temperature. A vector quantity has both magnitude and direction, for example velocity and force. Scalars add by ordinary arithmetic, while vectors follow the triangle or parallelogram law of addition."
      },
      {
        "q": "Define static and kinetic friction.",
        "model_answer": "Static friction acts between surfaces at rest and adjusts up to a maximum (μs·N) to prevent motion. Kinetic friction acts during sliding and is nearly constant (μk·N), usually smaller than maximum static friction. Both oppose relative motion."
      },
      {
        "q": "Define impulse and state its relation with momentum.",
        "model_answer": "Impulse is the product of force and the time it acts: J = F·t. It equals the change in linear momentum: J = Δp = m(v − u). Its SI unit is newton-second (N·s)."
      }
    ],
    "longs": [
      {
        "q": "Derive the three equations of motion for a body moving with uniform acceleration.",
        "model_answer": "Consider a body with initial velocity u and constant acceleration a. (1) By definition a = (v − u)/t, so v = u + at. (2) Average velocity = (u + v)/2; displacement s = average velocity × t = (u + v)t/2. Substituting v = u + at gives s = ut + ½at². (3) From v = u + at, t = (v − u)/a; putting this in s = (u + v)t/2 gives 2as = v² − u², i.e. v² = u² + 2as."
      },
      {
        "q": "Explain Newton's second law of motion and derive F = ma.",
        "model_answer": "The second law states that the rate of change of momentum of a body is proportional to the applied force and occurs in the direction of the force. Momentum p = mv, so dp/dt = m(dv/dt) = ma for constant mass. Hence F is proportional to ma; choosing units so the constant is 1 gives F = ma. One newton is the force that gives 1 kg mass an acceleration of 1 m/s². This law defines force quantitatively and explains why heavier objects need larger forces for the same acceleration."
      },
      {
        "q": "State and prove the work-energy theorem.",
        "model_answer": "The work-energy theorem states that the net work done on a body equals its change in kinetic energy. Proof: for constant force F over displacement s, W = F·s. Using F = ma and v² = u² + 2as, we get W = ma × (v² − u²)/(2a) = ½mv² − ½mu² = KE(final) − KE(initial). Thus work done by the net force appears as a change in kinetic energy. Example: brakes do negative work on a car, reducing its kinetic energy to zero."
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
