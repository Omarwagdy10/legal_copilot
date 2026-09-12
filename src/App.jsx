import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import AskCopilot from './pages/AskCopilot';
import Deviation from './pages/Deviation';
import Login from './pages/Login';

export default function App(){
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/documents" element={<Documents/>}/>
      <Route path="/ask" element={<AskCopilot/>}/>
      <Route path="/deviation" element={<Deviation/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></BrowserRouter>
}
