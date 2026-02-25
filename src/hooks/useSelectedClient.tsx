import { createContext, useContext, useState, ReactNode } from "react";

interface ClientContextType {
  clientId: string;
  setClientId: (id: string) => void;
}

const ClientContext = createContext<ClientContextType>({ clientId: "", setClientId: () => {} });

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState("");
  return (
    <ClientContext.Provider value={{ clientId, setClientId }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useSelectedClient() {
  return useContext(ClientContext);
}
