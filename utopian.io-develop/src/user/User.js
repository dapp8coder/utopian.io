import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import {
  getIsAuthenticated,
  getAuthenticatedUser,
  getUser,
} from '../reducers';

import { openTransfer } from '../wallet/walletActions';
import { getAccountWithFollowingCount } from './usersActions';
import UserHero from './UserHero';
import LeftSidebar from '../app/Sidebar/LeftSidebar';
import RightSidebar from '../app/Sidebar/RightSidebar';
import Affix from '../components/Utils/Affix';
import ScrollToTopOnMount from '../components/Utils/ScrollToTopOnMount';

import UserProfile from './UserProfile';
import UserComments from './UserComments';
import UserFollowers from './UserFollowers';
import UserFollowing from './UserFollowing';
import UserWallet from './UserWallet';
import ProjectsFeed from '../feed/ProjectsFeed';
import UserReblogs from './UserReblogs';
import UserFeed from './UserFeed';
import SubFeed from '../feed/SubFeed';

import GithubConnect from './GithubConnect';

export const needs = [getAccountWithFollowingCount];

import EmptyFeed from '../statics/EmptyFeed';

import { getReposByGithub } from '../actions/projects';
import * as Actions from '../actions/constants';

@connect(
  (state, ownProps) => ({
    authenticated: getIsAuthenticated(state),
    authenticatedUser: getAuthenticatedUser(state),
    user: getUser(state, ownProps.match.params.name),
    loading: state.loading,
  }), {
    getAccountWithFollowingCount,
    openTransfer,
    getReposByGithub,
  })
export default class User extends React.Component {
  static propTypes = {
    authenticated: PropTypes.bool.isRequired,
    authenticatedUser: PropTypes.shape().isRequired,
    match: PropTypes.shape().isRequired,
    user: PropTypes.shape().isRequired,
    getAccountWithFollowingCount: PropTypes.func,
    openTransfer: PropTypes.func,
  };

  static defaultProps = {
    getAccountWithFollowingCount: () => {},
    openTransfer: () => {},
  };

  static needs = needs;

  constructor(props) {
    super(props);

    this.state = {
      githubProjects: [],
      popoverVisible: false,
    };
  }

  componentWillMount() {
    const { getReposByGithub, match } = this.props;
    if (!this.props.user.name) {
      this.props.getAccountWithFollowingCount({ name: this.props.match.params.name });
      return;
    }

    getReposByGithub(match.params.name).then(res => {
      this.setState({
        githubProjects: res.response || []
      })
    });
  }


  componentDidUpdate(prevProps) {
    const { getReposByGithub, match, authenticatedUser, user } = this.props;

    if (prevProps.match.params.name !== this.props.match.params.name) {
      this.props.getAccountWithFollowingCount({ name: this.props.match.params.name });
    }

    if (prevProps.user !== user) {
      const isOnwer = authenticatedUser && authenticatedUser.name === match.params.name;

      getReposByGithub(match.params.name, isOnwer).then(res => {
        this.setState({
          githubProjects: res.response || []
        })
      });
    }
  }

  handleUserMenuSelect = (key) => {
    if (key === 'transfer') {
      this.props.openTransfer(this.props.match.params.name);
      this.setState({
        popoverVisible: false,
      });
    }
  };

  handleVisibleChange = (visible) => {
    this.setState({ popoverVisible: visible });
  }

  render() {
    const { authenticated, authenticatedUser, match, loading, getReposByGithub } = this.props;
    const username = this.props.match.params.name;
    const { user } = this.props;
    const { profile = {} } = user.json_metadata || {};
    const busyHost = global.postOrigin || 'https://utopian.io';
    const desc = profile.about || `Post by ${username}`;
    const image = `${process.env.STEEMCONNECT_IMG_HOST}/@${username}`;
    const canonicalUrl = `${busyHost}/@${username}`;
    const url = `${busyHost}/@${username}`;
    const displayedUsername = profile.name || username || '';
    const hasCover = !!profile.cover_image;
    const title = `${displayedUsername} - Utopian`;

    const isSameUser = authenticated && authenticatedUser.name === username;

    return (
      <div className="main-panel">
        <Helmet>
          <title>
            {title}
          </title>
          <link rel="canonical" href={canonicalUrl} />
          <meta property="description" content={desc} />

          <meta property="og:title" content={title} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={url} />
          <meta property="og:image" content={image} />
          <meta property="og:description" content={desc} />
          <meta property="og:site_name" content="Utopian" />

          <meta property="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
          <meta property="twitter:site" content={'@steemit'} />
          <meta property="twitter:title" content={title} />
          <meta property="twitter:description" content={desc} />
          <meta
            property="twitter:image"
            content={image || 'https://steemit.com/images/steemit-twshare.png'}
          />
        </Helmet>
        <ScrollToTopOnMount />
        {user && (
          <UserHero
            authenticated={authenticated}
            user={user}
            username={displayedUsername}
            isSameUser={isSameUser}
            hasCover={hasCover}
            onFollowClick={this.handleFollowClick}
            onSelect={this.handleUserMenuSelect}
            isPopoverVisible={this.state.popoverVisible}
            handleVisibleChange={this.handleVisibleChange}
          />
        )}
        <div className="shifted">
          <div className="feed-layout container">
            <Affix className="leftContainer leftContainer__user" stickPosition={72}>
              <div className="left">
                <LeftSidebar />
              </div>
            </Affix>
            <Affix className="rightContainer" stickPosition={72}>
              <div className="right">
                {user && user.name &&
                <RightSidebar key={user.name} match={match} />
                }
              </div>
            </Affix>
            <div className="center">
              <Switch>
                <Route exact path={`${match.path}`} component={UserProfile} />
                <Route exact path={`${match.path}/contributions/:status?`} component={UserProfile} />
                <Route exact path={`${match.path}/moderations/:status?/:startDate?/:endDate?`} component={UserProfile} />
                <Route
                  path={`${match.path}/projects`}
                  component={() => {
                    if (this.state.githubProjects.length) {
                      return (
                        <ProjectsFeed
                          content={this.state.githubProjects}
                          isFetching={loading === Actions.GET_USER_REPOS_GITHUB_REQUEST}
                          hasMore={false}
                          loadMoreContent={() => null}
                        />
                      );
                    }
                    if (!this.state.githubProjects.length && loading !== Actions.GET_USER_REPOS_GITHUB_REQUEST) {
                      return <EmptyFeed type={'project'} />;
                    }
                  }}
                />
                <Route path={`${match.path}/followers`} component={UserFollowers} />
                <Route path={`${match.path}/followed`} component={UserFollowing} />
                <Route path={`${match.path}/transfers`} component={UserWallet} />
                {/* <Route path={`${match.path}/reblogs`} component={UserReblogs} /> */}
                {/* <Route path={`${match.path}/feed`} component={UserFeed} /> */}
              </Switch>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
