// Authored educational introductions independent of uploaded files. These guides
// do not imply any uploaded PDF has been verified against the current syllabus.
export const SUBJECT_GUIDES = {
  CS101: {
    subject: 'Introduction to Computing', title: 'CS101: From Bits to Programs — A Practical Study Guide',
    intro: 'Computers represent information as bits, transform that information through instructions and communicate it across networks. These ideas connect the hardware, software and problem-solving topics that students encounter in introductory computing.',
    sections: [
      {heading:'1. Binary representation and units',text:'A bit is either 0 or 1, and eight bits make a byte. To convert binary 101101 to decimal, add the place values whose bits are 1: 32 + 8 + 4 + 1 = 45. A kilobyte is sometimes used to mean 1,000 bytes, whereas a kibibyte (KiB) is 1,024 bytes; pay attention to which convention your course uses. Practise moving between binary and decimal before memorising larger number-system tables.'},
      {heading:'2. Hardware, memory and storage',text:'A CPU executes instructions, RAM holds working data while a program runs, and persistent storage retains files after power is removed. Consider editing a document: the processor runs the editor, the current document is held in working memory, and saving writes data to persistent storage. An SSD and RAM are not interchangeable simply because both contain electronic components.'},
      {heading:'3. Algorithms before code',text:'An algorithm is a finite sequence of steps. For a program that finds the largest of three numbers, start with the first number as the current maximum, compare the second and update if larger, then compare the third. Trace the algorithm with equal numbers and negative numbers as well as ordinary examples. A flowchart or pseudocode is useful only if it helps you explain why the algorithm works.'},
      {heading:'4. Check your understanding',text:'Try this: convert 11001₂ to decimal, explain why a file survives a restart but a value stored only in RAM does not, and trace a maximum-finding algorithm for -2, -8 and -1. Answers: 25; persistent storage retains files without power; the maximum is -1. If any answer was difficult, revisit its underlying concept rather than repeating only its question.'}
    ]
  },
  CS201: {
    subject: 'Introduction to Programming', title: 'CS201: Variables, Functions and Program Tracing',
    intro: 'Learning programming requires reasoning about what the computer will do, not only recognising the shape of a code example. Small programs are easier to test when every variable and function has one clearly stated purpose.',
    sections: [
      {heading:'1. Data and program state',text:'A variable stores a value of a particular type. In a C++-style example, int count = 3; count = count + 2; leaves count equal to 5. The assignment operator changes program state; it is not an algebraic assertion that both sides are always equal. Choose types carefully: integer division such as 7 / 2 yields 3 when both operands are integers, whereas floating-point division can produce 3.5.'},
      {heading:'2. Branches and loops',text:'A conditional selects a path, while a loop repeats a group of statements. To total the integers 1 through 4, initialise sum to 0 and add each value in a loop: the successive totals are 1, 3, 6 and 10. Check both the loop condition and the variable update; an off-by-one error can omit the final value or execute an extra iteration.'},
      {heading:'3. Functions and testing',text:'A function groups a task behind an interface. A function that returns the square of an integer can receive 4 and return 16 without changing unrelated variables. When debugging, test the smallest normal input, boundary inputs such as 0, and unexpected but valid inputs such as a negative number. Trace parameter values separately from values returned to the caller.'},
      {heading:'4. Practice',text:'Write pseudocode that counts how many numbers in an array are even. Initialise a counter, visit each element, test remainder modulo 2, and increment only for even values. Verify the result on an empty array, an all-odd array and [2, 5, 8, 10], which should yield 0, 0 and 3 respectively.'}
    ]
  },
  CS620: {
    subject: 'Modelling and Simulation', title: 'CS620: Models, Randomness and Simulation Experiments',
    intro: 'A simulation uses a model to explore how a system behaves under specified assumptions. It does not prove that the model perfectly represents reality; the quality of its conclusions depends on its inputs, logic and validation.',
    sections: [
      {heading:'1. Identify the model boundary',text:'Imagine a service desk with arriving customers and one clerk. A simple queueing model might represent each arrival time, service time and waiting line. It may ignore customer mood, staffing breaks and equipment failures. Write down what is included and excluded before calculating results. The model is useful for a narrowly defined question, such as estimating waiting time at a given arrival rate.'},
      {heading:'2. Discrete events versus continuous change',text:'A discrete-event simulation updates its state at events such as customer arrivals and service completions. A continuous simulation instead describes variables changing with time, such as the temperature of a cooling object. Some real-world systems require a hybrid model. Distinguish the simulated clock from the computer time required to run the program.'},
      {heading:'3. Random inputs and repeated runs',text:'If customer service times vary, a simulation may draw values from a chosen probability distribution. One run is only one outcome, so repeat the experiment with multiple random seeds and summarise the variation. For observed waiting times of 2, 4 and 6 minutes, the sample mean is 4 minutes. That average does not tell you the longest wait or whether your distribution choice was realistic.'},
      {heading:'4. Verification and validation',text:'Verification asks whether the program implements the intended model correctly; validation asks whether the model is an adequate representation of the real system for its purpose. A perfectly coded queue simulator can still mislead if real service times or arrival patterns are badly estimated. Compare outputs with observed behaviour, document uncertainty, and change one experimental factor at a time when interpreting effects.'}
    ]
  },
  HRM613: {
    subject: 'Performance Management', title: 'HRM613: Goals, Feedback and Fair Performance Evaluation',
    intro: 'Performance management is an ongoing process of agreeing on expectations, monitoring progress and helping employees develop. A periodic performance appraisal is one component of that wider process, not a substitute for it.',
    sections: [
      {heading:'1. Set measurable expectations',text:'An unclear goal such as “improve service” gives an employee little guidance. A more measurable version might be “respond to 90% of support tickets within one business day during the next quarter.” The target should match the role and available resources. A measurable goal is not automatically fair: workload, ticket complexity and staffing also affect results.'},
      {heading:'2. Give timely, specific feedback',text:'Useful feedback connects an observed action to its effect and a next step. For example, “the maintenance handover omitted the fault code, which delayed diagnosis; include it on every shift report” is more actionable than “be more professional.” Give employees a chance to explain constraints and confirm the agreed improvement. Regular conversations reduce reliance on a single annual rating.'},
      {heading:'3. Recognise appraisal bias',text:'The halo effect occurs when one favourable characteristic influences unrelated ratings. Recency bias places too much weight on the latest events. To reduce such errors, gather examples across the evaluation period, use consistent criteria and distinguish observed work from assumptions about personality. Consistency does not require treating every different role as though it has identical responsibilities.'},
      {heading:'4. Apply the concepts',text:'Consider two employees: one consistently meets routine output targets; the other handles fewer tasks but resolves more complex failures. A raw task count cannot establish who performed better. First define relevant outcomes, quality standards, role expectations and available resources; then evaluate evidence against those criteria. In a practice MCQ, look for the principle behind the answer instead of memorising a rating label.'}
    ]
  },
  PHY101: {
    subject: 'Physics', title: 'PHY101: Motion, Forces and Units Worked Through',
    intro: 'Physics problems become easier to check when you separate the given quantities, the model, the equation and the unit of the result. A formula should be selected because its assumptions fit the situation, not because its symbols resemble the question.',
    sections: [
      {heading:'1. Distinguish distance, displacement and acceleration',text:'Distance is total path length; displacement is the change in position with direction. A student walks 3 m east and then 3 m west: distance is 6 m, displacement is 0 m. Acceleration measures how quickly velocity changes. Under constant acceleration, v = u + at, where u is initial velocity, v final velocity, a acceleration and t elapsed time.'},
      {heading:'2. A worked motion example',text:'A cart starts at 2 m/s and accelerates uniformly at 3 m/s² for 4 s. Its final speed is v = 2 + 3 × 4 = 14 m/s. Its displacement is s = ut + ½at² = 2 × 4 + ½ × 3 × 16 = 32 m. Both equations assume constant acceleration in the direction of motion.'},
      {heading:'3. Forces and energy',text:'Newton’s second law states that net force equals mass times acceleration for constant mass. A net force of 10 N acting on a 2 kg object produces an acceleration of 5 m/s². Work done by a constant force parallel to displacement equals force times distance; a 10 N push over 3 m performs 30 J of work. Units help catch mistakes before an answer is submitted.'},
      {heading:'4. Self-check',text:'Draw a simple diagram, list quantities with SI units, select an equation and verify the final unit. Recalculate a result with a boundary case: if the acceleration in the cart example becomes zero, the final speed should remain 2 m/s and the displacement over 4 s should be 8 m.'}
    ]
  },
  MTH101: {
    subject: 'Calculus', title: 'MTH101: Limits, Derivatives and Interpreting Change',
    intro: 'Calculus studies changing quantities. Rather than beginning with a memorised rule, first identify what is changing and what a numerical result represents.',
    sections: [
      {heading:'1. Limits and continuity',text:'A limit describes the value approached as the input moves toward a point. For f(x) = (x² - 4)/(x - 2), the expression is undefined at x = 2, but for x ≠ 2 it simplifies to x + 2. The limit as x approaches 2 is therefore 4. A limit can exist even when the original function is undefined at that point.'},
      {heading:'2. Derivatives as rates',text:'For f(x) = x², the derivative f′(x) = 2x gives the instantaneous rate of change. At x = 3, the slope is 6; this is not the value of the function, which is 9. If position is measured in metres and time in seconds, differentiating position with respect to time gives velocity in metres per second.'},
      {heading:'3. Optimisation with a check',text:'A rectangle with fixed perimeter 20 has sides x and 10 - x, so its area is A(x) = 10x - x² for 0 < x < 10. The derivative is 10 - 2x; setting it to zero gives x = 5. The second derivative is -2, confirming a maximum area of 25 square units in this interval. Always check the permitted domain and endpoints in optimisation problems.'},
      {heading:'4. Practise carefully',text:'Differentiate 3x² + 2x, then evaluate the result at x = 1. The derivative is 6x + 2 and its value is 8. Explain in words why that result is a slope rather than the original function value of 5.'}
    ]
  }
};
export const GUIDE_CODES = Object.keys(SUBJECT_GUIDES);
export function guideForFile(file) {
  const subject = String(file?.subject || '').toUpperCase().trim();
  const name = String(file?.name || file?.title || '').toUpperCase();
  return GUIDE_CODES.find((code) => subject === code || new RegExp('(^|[^A-Z0-9])' + code + '([^A-Z0-9]|$)').test(subject) ||
    new RegExp('(^|[^A-Z0-9])' + code + '([^A-Z0-9]|$)').test(name)) || null;
}
