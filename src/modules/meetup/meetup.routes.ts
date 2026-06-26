import { Router } from 'express';
import { meetupController } from './meetup.controller';

const meetupRouter = Router();

// Routes under /api/meetup
meetupRouter.post('/groups', meetupController.createGroup.bind(meetupController));
meetupRouter.post('/groups/join', meetupController.joinGroup.bind(meetupController));
meetupRouter.get('/groups/:groupId', meetupController.getGroupDetails.bind(meetupController));
meetupRouter.post('/groups/:groupId/members/:memberId/location', meetupController.updateLocation.bind(meetupController));
meetupRouter.put('/groups/:groupId/assembly', meetupController.setAssemblyPoint.bind(meetupController));
meetupRouter.delete('/groups/:groupId/members/:memberId', meetupController.leaveGroup.bind(meetupController));

export default meetupRouter;
