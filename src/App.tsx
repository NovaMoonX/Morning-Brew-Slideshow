import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { router } from '@routes/AppRoutes';
import { store } from '@store/index';

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

export default App;
