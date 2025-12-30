import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { type AnyApiError, isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { Loader } from "@/components/ui/Loader/Loader";

export function Logout() {
  const { logout } = useApiState();
  const navigate = useNavigate();
  const [error, setError] = useState<AnyApiError | null>(null);

  // logout the user when the component is mounted
  useEffect(() => {
    void logout().then((result) => {
      if (isError(result)) {
        setError(result);
      } else {
        void navigate("/account/login");
      }
    });
  }, [logout, navigate]);

  if (error) {
    throw error;
  }

  return <Loader />;
}
