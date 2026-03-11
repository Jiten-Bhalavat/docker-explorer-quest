export interface LevelData {
  id: number;
  title: string;
  description: string;
  conceptSummary: string[];
  challengeType: 'terminal' | 'click' | 'drag' | 'slider' | 'button';
  challengePrompt: string;
  expectedCommands: string[];
  hints: string[];
  terminalCommands?: string[];
}

export const levels: LevelData[] = [
  {
    id: 1, title: 'What is Docker?', description: 'VMs vs Containers — the big picture',
    conceptSummary: ['Docker uses containers instead of full VMs', 'Containers share the host OS kernel', 'Containers are lightweight and start fast', 'Each container is isolated from others'],
    challengeType: 'click', challengePrompt: 'Click "I Understand" to continue', expectedCommands: [],
    hints: ['Just click the button!'],
  },
  {
    id: 2, title: 'Containerization', description: 'Isolated environments for every app',
    conceptSummary: ['Each app runs in its own container', 'No dependency conflicts between apps', 'Containers include only what the app needs', 'Isolation ensures security and stability'],
    challengeType: 'click', challengePrompt: 'Click "I Understand" to continue', expectedCommands: [],
    hints: ['Click the button to proceed'],
  },
  {
    id: 3, title: 'Installing Docker', description: 'Get Docker running on your system',
    conceptSummary: ['Docker Engine is the runtime', 'Docker CLI lets you interact via terminal', 'Docker Desktop includes GUI tools', 'Available for Linux, Mac, and Windows'],
    challengeType: 'button', challengePrompt: 'Click "Install Docker" to simulate installation', expectedCommands: [],
    hints: ['Click the Install Docker button'],
  },
  {
    id: 4, title: 'Docker Images', description: 'Blueprints made of layers',
    conceptSummary: ['Images are read-only templates', 'Built from layers stacked on top', 'Base image provides the OS', 'Each instruction adds a new layer'],
    challengeType: 'click', challengePrompt: 'Arrange the layers in the correct order', expectedCommands: [],
    hints: ['Base image goes on bottom', 'Libraries in the middle', 'Your app on top'],
  },
  {
    id: 5, title: 'Docker Containers', description: 'Running instances of images',
    conceptSummary: ['A container is a running image', 'docker run creates and starts a container', 'Containers are ephemeral by default', 'You can run multiple containers from one image'],
    challengeType: 'terminal', challengePrompt: 'Run your first container!', expectedCommands: ['docker run hello-world'],
    hints: ['Use the docker run command', 'Specify the image name hello-world', 'Type: docker run hello-world'],
  },
  {
    id: 6, title: 'Docker Commands', description: 'Essential commands every developer needs',
    conceptSummary: ['docker pull downloads images', 'docker run starts containers', 'docker ps lists running containers', 'docker images lists local images'],
    challengeType: 'terminal', challengePrompt: 'Pull and run an nginx container', expectedCommands: ['docker pull nginx', 'docker run nginx'],
    hints: ['First pull the image with docker pull', 'Use nginx as the image name', 'Then run it: docker run nginx'],
  },
  {
    id: 7, title: 'Dockerfile', description: 'Write your own image recipe',
    conceptSummary: ['FROM sets the base image', 'WORKDIR sets the working directory', 'COPY moves files into the image', 'CMD defines the startup command'],
    challengeType: 'click', challengePrompt: 'Click the Dockerfile instructions in correct order', expectedCommands: [],
    hints: ['Start with FROM', 'COPY comes before RUN', 'CMD is always last'],
  },
  {
    id: 8, title: 'Docker Build', description: 'Turn a Dockerfile into an image',
    conceptSummary: ['docker build reads the Dockerfile', 'Each instruction creates a layer', '-t flag tags the image with a name', 'The dot (.) specifies build context'],
    challengeType: 'terminal', challengePrompt: 'Build an image tagged "myapp"', expectedCommands: ['docker build -t myapp .'],
    hints: ['Use docker build command', 'Add -t flag to tag it', 'Type: docker build -t myapp .'],
  },
  {
    id: 9, title: 'Volumes', description: 'Persistent data storage',
    conceptSummary: ['Volumes persist data beyond container lifecycle', 'Data survives container deletion', 'Volumes can be shared between containers', 'Managed by Docker, not the container'],
    challengeType: 'terminal', challengePrompt: 'Create a volume named "mydata"', expectedCommands: ['docker volume create mydata'],
    hints: ['Use docker volume command', 'The subcommand is create', 'Type: docker volume create mydata'],
  },
  {
    id: 10, title: 'Docker Networking', description: 'Connect containers together',
    conceptSummary: ['Containers can communicate on shared networks', 'Docker creates bridge networks by default', 'Custom networks enable DNS-based discovery', 'Port mapping exposes containers externally'],
    challengeType: 'terminal', challengePrompt: 'Create a network named "mynetwork"', expectedCommands: ['docker network create mynetwork'],
    hints: ['Use docker network command', 'The subcommand is create', 'Type: docker network create mynetwork'],
  },
  {
    id: 11, title: 'Docker Compose', description: 'Multi-container orchestration',
    conceptSummary: ['Compose defines multi-container apps in YAML', 'docker compose up starts all services', 'Services can depend on each other', 'Networks and volumes are auto-created'],
    challengeType: 'terminal', challengePrompt: 'Start your compose stack', expectedCommands: ['docker compose up'],
    hints: ['Use docker compose command', 'The subcommand is up', 'Type: docker compose up'],
  },
  {
    id: 12, title: 'Container Lifecycle', description: 'Start, stop, pause, and remove',
    conceptSummary: ['Containers have states: created, running, paused, stopped', 'docker stop gracefully stops a container', 'docker rm removes a stopped container', 'docker pause freezes a running container'],
    challengeType: 'terminal', challengePrompt: 'Stop a running container', expectedCommands: ['docker stop'],
    hints: ['Use docker stop command', 'Provide any container ID', 'Type: docker stop abc123'],
  },
  {
    id: 13, title: 'Docker Registry', description: 'Share images with the world',
    conceptSummary: ['Docker Hub is the default public registry', 'docker push uploads images', 'docker pull downloads images', 'Private registries are available for teams'],
    challengeType: 'terminal', challengePrompt: 'Push your image to the registry', expectedCommands: ['docker push myapp'],
    hints: ['Use docker push command', 'Specify the image name', 'Type: docker push myapp'],
  },
  {
    id: 14, title: 'Scaling Containers', description: 'Handle more traffic with replicas',
    conceptSummary: ['Horizontal scaling runs multiple replicas', 'Load balancers distribute traffic', 'Each replica handles a portion of requests', 'Scaling is a key benefit of containers'],
    challengeType: 'slider', challengePrompt: 'Scale your containers from 1 to 3 replicas', expectedCommands: [],
    hints: ['Use the slider to increase replicas'],
  },
  {
    id: 15, title: 'Real World Deployment', description: 'Production architecture with Docker',
    conceptSummary: ['Production uses load balancers and multiple replicas', 'Databases need persistent volumes', 'Caching layers improve performance', 'The full stack runs in containers'],
    challengeType: 'button', challengePrompt: 'Click "Deploy to Production" to see the full architecture', expectedCommands: [],
    hints: ['Click the deploy button'],
  },
];

export const CHEATSHEET = [
  { command: 'docker pull <image>', description: 'Download an image from registry' },
  { command: 'docker run <image>', description: 'Create and start a container' },
  { command: 'docker run -p 8080:80 <image>', description: 'Run with port mapping' },
  { command: 'docker ps', description: 'List running containers' },
  { command: 'docker ps -a', description: 'List all containers' },
  { command: 'docker images', description: 'List downloaded images' },
  { command: 'docker stop <id>', description: 'Stop a running container' },
  { command: 'docker rm <id>', description: 'Remove a stopped container' },
  { command: 'docker build -t <name> .', description: 'Build image from Dockerfile' },
  { command: 'docker compose up', description: 'Start all services in compose file' },
  { command: 'docker compose down', description: 'Stop all compose services' },
  { command: 'docker volume create <name>', description: 'Create a named volume' },
  { command: 'docker network create <name>', description: 'Create a custom network' },
  { command: 'docker push <image>', description: 'Push image to registry' },
  { command: 'docker exec -it <id> bash', description: 'Open shell in running container' },
];
