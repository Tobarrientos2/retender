// Test script for Sessions Intelligence System
// This script tests the generateSessions endpoint directly

const testContent = `
The History of the Bicycle

The bicycle has a fascinating history that spans over two centuries. The first verifiable claim for a practically used bicycle belongs to German Baron Karl von Drais, who invented his "running machine" in 1817. This early bicycle was called a draisine or hobby horse and had no pedals - riders propelled themselves by pushing their feet against the ground.

In 1819, the first commercial bicycle was sold in London by Denis Johnson, who called it a "pedestrian curricle." These early bicycles were made entirely of wood and iron, making them quite heavy and uncomfortable to ride. The wheels were wooden with iron tires, and there was no suspension system.

The major breakthrough came in 1861 when Pierre Michaux and Pierre Lallement added pedals to the front wheel of a bicycle in Paris. This innovation created what became known as the "velocipede" or "boneshaker" due to its rough ride on cobblestone streets. The pedals were attached directly to the front wheel, which meant that one revolution of the pedals resulted in one revolution of the wheel.

In 1869, the first bicycle race was held in Paris, covering a distance of 1,200 meters. This event marked the beginning of competitive cycling as a sport. The same year saw the introduction of solid rubber tires, which provided a slightly more comfortable ride than the previous iron tires.

The 1870s brought the development of the "high-wheeler" or "penny-farthing" bicycle. These bicycles featured a very large front wheel (up to 60 inches in diameter) and a much smaller rear wheel. The large front wheel allowed for greater speed, as the distance traveled per pedal revolution was much greater. However, these bicycles were dangerous to ride due to their high center of gravity.

The safety bicycle was invented in 1885 by John Kemp Starley in England. This design featured two wheels of similar size, a chain drive to the rear wheel, and a diamond-shaped frame. This design is essentially the same as modern bicycles today. The safety bicycle was much more stable and easier to ride than the high-wheeler.

In 1888, John Boyd Dunlop invented the pneumatic tire, which revolutionized bicycle comfort and performance. These air-filled tires provided much better shock absorption and traction than solid rubber tires. This innovation made cycling much more pleasant and contributed to the bicycle boom of the 1890s.

The 1890s are often called the "Golden Age of Bicycles." During this decade, bicycle manufacturing became a major industry, and cycling became extremely popular among both men and women. The bicycle provided new freedom of movement, especially for women, and contributed to social changes including dress reform.
`;

console.log("Testing Sessions Intelligence System");
console.log("Content length:", testContent.length, "characters");
console.log("Word count:", testContent.trim().split(/\s+/).length, "words");
console.log("\nThis content should generate multiple themed sessions:");
console.log("- Temporal sessions (chronological events)");
console.log("- Innovation sessions (technical breakthroughs)");
console.log("- Social impact sessions (cultural changes)");
console.log("- People sessions (inventors and pioneers)");

console.log("\nTo test this:");
console.log("1. Open http://localhost:5173/");
console.log("2. Click 'Generate Sessions'");
console.log("3. Paste the content above");
console.log("4. Click 'Generate Intelligent Sessions'");
console.log("5. Verify multiple themed sessions are created");
