import * as React from "react";
import cls from "./applayout.module.css";
import { FixedHeaderController } from "./controller/FixedHeaderController";

export interface AppLayoutConfig {
  fixedHeader: boolean;
}

export interface iAppLayoutContext {
  getConfig: () => AppLayoutConfig;
  setConfig: (config: Partial<AppLayoutConfig>) => void;
}

export interface AppLayoutProps {
  children: React.ReactNode;
}

export type AppLayoutControllers = {
  fixedHeader: FixedHeaderController;
};

const defaultAppLayoutConfig: AppLayoutConfig = {
  fixedHeader: false
};

export const AppLayoutContext = React.createContext<iAppLayoutContext | null>(null);

//Reduce the amount of rerenders (State changes) to a minimum
export function AppLayout({ children }: AppLayoutProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const _config = React.useRef<AppLayoutConfig>(defaultAppLayoutConfig);

  const _controllers = React.useRef<AppLayoutControllers>({
    fixedHeader: new FixedHeaderController(ref)
  });

  const setConfig = React.useCallback((newConfig: Partial<AppLayoutConfig>) => {
    _config.current = {
      ..._config.current,
      ...newConfig
    };

    if (_config.current.fixedHeader) {
      _controllers.current.fixedHeader.register();
    } else {
      _controllers.current.fixedHeader.unregister();
    }
  }, []);

  const getConfig = React.useCallback(() => {
    return _config.current;
  }, []);

  const processConfig = (config: AppLayoutConfig) => {
    if (config.fixedHeader) {
      _controllers.current.fixedHeader.register();
    } else {
      _controllers.current.fixedHeader.unregister();
    }
  };

  React.useLayoutEffect(() => {
    processConfig(_config.current);
    const controllers = _controllers.current;
    return () => {
      Object.values(controllers).forEach((controller) => {
        controller.unregister();
      });
    };
  }, []);

  return (
    <AppLayoutContext.Provider value={{ setConfig, getConfig }}>
      <div className={cls["app-layout"]} ref={ref}>
        {children}
      </div>
    </AppLayoutContext.Provider>
  );
}
