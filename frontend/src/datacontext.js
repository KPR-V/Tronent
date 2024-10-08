import { createContext, useState } from "react";

const Datacontext = createContext({});
export const Dataprovider = ({ children }) => {
  const [projects, setProjects] = useState([]);

  return (
    <Datacontext.Provider value={{ projects, setProjects }}>
      {children}
    </Datacontext.Provider>
  );
};
export default Datacontext;
