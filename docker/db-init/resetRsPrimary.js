const rsConfig = rs.config();
const hostName = db.hostInfo().system.hostname;
rsConfig.members[0].host = `${hostName}:27017`;
printjson(rs.reconfig(rsConfig, { force: true }));
printjson(rs.config());
