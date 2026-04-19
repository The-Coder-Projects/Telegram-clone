// Re-export from the singleton SocketContext so any component calling
// useSocket() shares the same underlying connection.
export { useSocket } from "@/contexts/SocketContext";
