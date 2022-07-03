import chai from 'chai';
import chaiDeepMatch from 'chai-deep-match';

export function mochaGlobalSetup() {
	chai.use(chaiDeepMatch);
}
