// Counter to prevent ID collisions when called rapidly
let counter = 0;

// Utility to generate unique IDs
export const generateId = (): string => {
  counter = (counter + 1) % 10000; // Reset after 10000 to keep IDs shorter
  return `${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
};

