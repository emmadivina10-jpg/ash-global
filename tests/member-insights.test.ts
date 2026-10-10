import {describe,it,expect} from 'vitest';
import {canReviewMember,hasFreshPresence,MEMBER_TARGET,targetProgress} from '../src/lib/member-insights';
describe('staff member requirements',()=>{
 it('targets 10k over the confirmed six months',()=>{expect(MEMBER_TARGET).toEqual({count:10000,start:'2026-11-18',end:'2027-05-18'});expect(targetProgress(2500,'2026-11-18').percent).toBe(25);});
 it('does not show offline or missing evidence as online',()=>{const now=Date.parse('2026-10-10T17:00:00Z');expect(hasFreshPresence('2026-10-10T16:56:59Z',now)).toBe(false);expect(hasFreshPresence(null,now)).toBe(false);expect(hasFreshPresence('2026-10-10T17:01:00Z',now)).toBe(false);expect(hasFreshPresence('2026-10-10T16:59:00Z',now)).toBe(true);});
 for(const department of ['SUPPORT','TRUST','REVENUE'])it(`${department} can review`,()=>expect(canReviewMember({department,superAdmin:false})).toBe(true));
 for(const department of ['GROWTH','SALES','CYBERSECURITY','OPERATIONS','CONTENT','ADVERTISING'])it(`${department} cannot review`,()=>expect(canReviewMember({department,superAdmin:false})).toBe(false));
 it('admin can review without member impersonation',()=>expect(canReviewMember({department:'SUPER_ADMIN',superAdmin:true})).toBe(true));
 it('does not fabricate target progress with missing measurements',()=>expect(targetProgress(null).percent).toBe(null));
});
